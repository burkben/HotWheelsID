"""
Hot Wheels Portal Connection Handler

Main class for connecting to and interacting with the portal.
"""

import asyncio
from typing import Callable
from datetime import datetime
from dataclasses import dataclass, field

from bleak import BleakScanner, BleakClient
from bleak.backends.characteristic import BleakGATTCharacteristic

from .constants import (
    PORTAL_NAME,
    CHAR_FIRMWARE_VERSION,
    CHAR_SERIAL_NUMBER,
    CHAR_AUTH_COMMAND,
    CHAR_AUTH_KEY,
    CHAR_AUTH_RESPONSE,
    CHAR_CONTROL,
    CHAR_EVENT_1,
    CHAR_EVENT_2,
    CHAR_EVENT_3,
    CHAR_COMMAND,
    NOTIFY_CHARACTERISTICS,
    CHARACTERISTICS,
)


@dataclass
class PortalEvent:
    """Represents an event from the portal."""
    timestamp: datetime
    characteristic: str
    char_name: str
    data: bytes

    @property
    def data_hex(self) -> str:
        return self.data.hex()

    def __str__(self) -> str:
        return f"[{self.timestamp.strftime('%H:%M:%S.%f')[:-3]}] {self.char_name}: {self.data_hex}"


@dataclass
class PortalInfo:
    """Portal device information."""
    address: str
    firmware_version: str = ""
    serial_number: str = ""
    device_key: bytes = field(default_factory=bytes)


class HotWheelsPortal:
    """
    Main class for interacting with the Hot Wheels id Race Portal.

    Usage:
        async with HotWheelsPortal() as portal:
            info = await portal.get_info()
            print(f"Firmware: {info.firmware_version}")

            # Subscribe to events
            portal.on_event = my_callback
            await portal.start_monitoring()
    """

    def __init__(self, address: str | None = None):
        """
        Initialize the portal connection.

        Args:
            address: BLE device address. If None, will scan for portal.
        """
        self.address = address
        self.client: BleakClient | None = None
        self.info: PortalInfo | None = None
        self.events: list[PortalEvent] = []
        self._event_callbacks: list[Callable[[PortalEvent], None]] = []
        self._connected = False
        # Firmware generation, resolved by start_monitoring(): "legacy" (…-000c
        # control service), "mpid" (…-000a encrypted auth service), or "locked".
        self.mode: str = "unknown"
        self._mpid = None  # MpidSession when self.mode == "mpid"

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()

    @staticmethod
    async def scan(timeout: float = 10.0) -> list[tuple[str, str]]:
        """
        Scan for Hot Wheels portals.

        Returns:
            List of (address, name) tuples for found portals.
        """
        portals = []
        devices = await BleakScanner.discover(timeout=timeout)

        for device in devices:
            if device.name and PORTAL_NAME.lower() in device.name.lower():
                portals.append((device.address, device.name))

        return portals

    async def connect(self) -> bool:
        """Connect to the portal."""
        if self._connected:
            return True

        # Find portal if address not provided
        if self.address is None:
            portals = await self.scan()
            if not portals:
                raise ConnectionError("No Hot Wheels Portal found")
            self.address = portals[0][0]

        # Connect
        self.client = BleakClient(self.address)
        await self.client.connect()
        self._connected = self.client.is_connected

        if self._connected:
            # Read device info
            self.info = await self._read_device_info()

        return self._connected

    async def disconnect(self):
        """Disconnect from the portal."""
        if self.client and self._connected:
            await self.client.disconnect()
            self._connected = False

    @property
    def is_connected(self) -> bool:
        return self._connected and self.client is not None and self.client.is_connected

    def _supports(self, uuid: str) -> bool:
        """True if the connected portal exposes the given characteristic."""
        try:
            return (
                self.client is not None
                and self.client.services.get_characteristic(uuid) is not None
            )
        except Exception:
            return False

    def _is_legacy(self) -> bool:
        """Legacy firmware exposes the …-000c event characteristics."""
        return self._supports(CHAR_EVENT_2) or self._supports(CHAR_EVENT_3)

    def _is_mpid(self) -> bool:
        """Modern firmware exposes the …-000a encrypted auth service."""
        return (
            self._supports(CHAR_AUTH_COMMAND)
            and self._supports(CHAR_AUTH_KEY)
            and self._supports(CHAR_AUTH_RESPONSE)
        )

    async def _read_device_info(self) -> PortalInfo:
        """Read device information from the portal."""
        info = PortalInfo(address=self.address)

        try:
            fw_bytes = await self.client.read_gatt_char(CHAR_FIRMWARE_VERSION)
            info.firmware_version = fw_bytes.decode("utf-8")
        except Exception:
            pass

        try:
            sn_bytes = await self.client.read_gatt_char(CHAR_SERIAL_NUMBER)
            info.serial_number = sn_bytes.decode("utf-8")
        except Exception:
            pass

        try:
            info.device_key = bytes(await self.client.read_gatt_char(CHAR_AUTH_KEY))
        except Exception:
            pass

        # Modern (MPID) firmware exposes no legacy firmware-version characteristic;
        # the real version arrives later in the encrypted heartbeat. Label it now so
        # status displays aren't blank before the first heartbeat.
        if not info.firmware_version and self._is_mpid():
            info.firmware_version = "modern (MPID)"

        return info

    async def get_info(self) -> PortalInfo:
        """Get portal device information."""
        if self.info is None:
            self.info = await self._read_device_info()
        return self.info

    def on_event(self, callback: Callable[[PortalEvent], None]):
        """Register an event callback."""
        self._event_callbacks.append(callback)

    def _emit(self, characteristic: str, data: bytes):
        """Build a PortalEvent and dispatch it to history + registered callbacks.

        This is the single choke point for both transports: legacy BLE
        notifications and synthesized MPID events flow through here, so every
        consumer sees the same legacy ``(characteristic, data)`` shape.
        """
        char_info = CHARACTERISTICS.get(characteristic, {})
        char_name = char_info.get("name", "Unknown")

        event = PortalEvent(
            timestamp=datetime.now(),
            characteristic=characteristic,
            char_name=char_name,
            data=bytes(data),
        )

        self.events.append(event)

        for callback in self._event_callbacks:
            try:
                callback(event)
            except Exception as e:
                print(f"Event callback error: {e}")

    def _notification_handler(self, characteristic: BleakGATTCharacteristic, data: bytearray):
        """Internal handler for legacy BLE notifications."""
        self._emit(characteristic.uuid, bytes(data))

    # ------------------------------------------------------------------
    # MPID (modern firmware) transport
    # ------------------------------------------------------------------

    def _mpid_handler(self, characteristic: BleakGATTCharacteristic, data: bytearray):
        """Feed encrypted TX/RX notifications through the MPID session."""
        if self._mpid is None:
            return
        try:
            payloads = self._mpid.feed(bytes(data))
        except Exception as e:
            print(f"MPID decode error: {e}")
            return

        from .mpid import parse_message

        for payload in payloads:
            try:
                self._emit_mpid_message(parse_message(payload))
            except Exception as e:
                print(f"MPID parse error: {e}")

    def _mpid_session_handler(self, characteristic: BleakGATTCharacteristic, data: bytearray):
        """SESSION indications are part of the handshake but carry no app data."""
        return

    def _emit_mpid_message(self, msg):
        """Translate a decoded MPID message into legacy PortalEvents.

        ``to_legacy_events`` already produces the exact ``(characteristic, data)``
        tuples the legacy handlers branch on (car-detected, NDEF, speed). On top
        of that we (1) refresh device info from heartbeats so displays can show
        the real firmware/serial, and (2) synthesize a CHAR_SERIAL_NUMBER event
        from the per-car ``mattel_id`` (modern firmware carries car identity in
        the NDEF, not the legacy serial characteristic).
        """
        from .mpid import to_legacy_events

        if msg.info is not None and self.info is not None:
            if msg.info.semantic_firmware_version:
                self.info.firmware_version = msg.info.semantic_firmware_version
            if msg.info.serial_number:
                self.info.serial_number = msg.info.serial_number

        for char_uuid, evt_data in to_legacy_events(msg):
            self._emit(char_uuid, evt_data)

        # Emit per-car identity AFTER the car-detected event so a consumer's
        # "current car" is set before the serial arrives (mirrors legacy order).
        ev = getattr(msg, "event", None)
        car_info = getattr(ev, "car_info", None) if ev is not None else None
        if car_info is not None and getattr(car_info, "mattel_id", ""):
            self._emit(CHAR_SERIAL_NUMBER, str(car_info.mattel_id).encode("utf-8"))

    async def start_monitoring(self):
        """Start monitoring for portal events, auto-detecting the firmware.

        Mirrors the mobile app's ``blePortal.ts`` flow: legacy …-000c control
        service → subscribe to its notify characteristics; otherwise the modern
        …-000a auth service → run the MPID handshake and synthesize legacy
        events; otherwise the portal is locked/unsupported.
        """
        if not self.is_connected:
            raise ConnectionError("Not connected to portal")

        if self._is_legacy():
            self.mode = "legacy"
            await self._start_legacy_monitoring()
        elif self._is_mpid():
            self.mode = "mpid"
            await self._start_mpid_monitoring()
        else:
            self.mode = "locked"
            raise ConnectionError(
                "Portal exposes neither the legacy control service nor the MPID "
                "auth service — unsupported or locked firmware."
            )

    async def _start_legacy_monitoring(self):
        """Subscribe to the legacy …-000c notify characteristics."""
        for char_uuid in NOTIFY_CHARACTERISTICS:
            try:
                await self.client.start_notify(char_uuid, self._notification_handler)
            except Exception:
                pass  # Some characteristics may not support notifications

    async def _start_mpid_monitoring(self):
        """Run the MPID P-256 ECDH handshake, then stream decoded telemetry.

        Mirrors ``mpid_monitor.py::_session_once``: subscribe to TX/RX, read the
        FACTORY token, write the SESSION payload. Telemetry then arrives on TX/RX
        and is decoded + re-emitted as legacy events by ``_mpid_handler``.
        """
        from .mpid import MpidSession

        self._mpid = MpidSession()

        # TX/RX, FACTORY and SESSION are the auth-service characteristics
        # (…-0002/0003/0004-000a) — aliased here via their CHAR_AUTH_* names.
        await self.client.start_notify(CHAR_AUTH_COMMAND, self._mpid_handler)
        try:
            await self.client.start_notify(CHAR_AUTH_RESPONSE, self._mpid_session_handler)
        except Exception:
            pass  # SESSION indications are best-effort

        token = bytes(await self.client.read_gatt_char(CHAR_AUTH_KEY))
        session_payload = self._mpid.start_session(token)
        await self.client.write_gatt_char(CHAR_AUTH_RESPONSE, session_payload, response=True)

    async def stop_monitoring(self):
        """Stop monitoring for portal events."""
        if not self.is_connected:
            return

        if self.mode == "mpid":
            for char_uuid in (CHAR_AUTH_COMMAND, CHAR_AUTH_RESPONSE):
                try:
                    await self.client.stop_notify(char_uuid)
                except Exception:
                    pass
            self._mpid = None
        else:
            for char_uuid in NOTIFY_CHARACTERISTICS:
                try:
                    await self.client.stop_notify(char_uuid)
                except Exception:
                    pass

    async def read_control_register(self) -> bytes:
        """Read the control register value."""
        if not self.is_connected:
            raise ConnectionError("Not connected to portal")

        return bytes(await self.client.read_gatt_char(CHAR_CONTROL))

    async def write_control_register(self, data: bytes):
        """Write to the control register."""
        if not self.is_connected:
            raise ConnectionError("Not connected to portal")

        await self.client.write_gatt_char(CHAR_CONTROL, data)

    async def send_command(self, data: bytes):
        """Send a command to the portal."""
        if not self.is_connected:
            raise ConnectionError("Not connected to portal")

        await self.client.write_gatt_char(CHAR_COMMAND, data)

    def get_events(self, characteristic: str | None = None) -> list[PortalEvent]:
        """
        Get captured events, optionally filtered by characteristic.

        Args:
            characteristic: UUID to filter by, or None for all events.
        """
        if characteristic is None:
            return self.events.copy()

        return [e for e in self.events if e.characteristic == characteristic]

    def clear_events(self):
        """Clear the event log."""
        self.events.clear()
