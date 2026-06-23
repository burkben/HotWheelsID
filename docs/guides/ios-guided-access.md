# Using Redline ID in Guided Access (kids' iPad / kiosk lock)

iOS **Guided Access** locks the iPad (or iPhone) into a single app until you enter a
passcode — perfect for handing the device to a kid for a race session without them
wandering off into other apps. Redline ID works great this way, with **one Bluetooth
gotcha** that can make the speedometer look dead and even lock you out of Guided Access
itself. This guide explains why, and the one-minute setup that avoids it.

> **TL;DR.** Turn Bluetooth **on** and tap **Connect portal** once (accepting the Bluetooth
> permission prompt) **before** you triple-click into Guided Access. iOS hides Bluetooth
> prompts *during* a Guided Access session, so anything that needs one has to happen first.

---

## Why Bluetooth and Guided Access can fight

Redline ID talks to the Race Portal over Bluetooth (CoreBluetooth). iOS guards Bluetooth
with **system dialogs** — the one-time "Allow Redline ID to use Bluetooth?" permission
prompt, and the "Turn On Bluetooth" alert when the radio is off. Two iOS behaviors collide
during Guided Access:

1. **iOS suppresses system dialogs while a Guided Access session is active.** If the first
   Bluetooth prompt (or the "Bluetooth is off" alert) would have appeared mid-session, it
   never shows — so the portal silently never connects and the **speedometer registers
   nothing**.
2. **A still-pending system dialog blocks Guided Access from starting.** If a Bluetooth
   alert is waiting to be answered, triple-clicking to start Guided Access fails with an
   iOS error ("Guided Access could not be started" / it just won't engage).

That's the whole bug in a nutshell: a dead gauge under the lock, and then being unable to
re-enter Guided Access afterward.

**What the app already does to help:**

- It **warms up Bluetooth at launch**, on the normal home screen, so the permission prompt
  (and any "Bluetooth is off" alert) appears *before* you ever start a session — not in the
  middle of one.
- The home **speedometer screen shows a banner** when Bluetooth is off or permission is
  denied, with an **Open Settings** shortcut, so a stalled gauge always explains itself.

The clean fix is still to get Bluetooth sorted out **before** locking the device down.

---

## One-time setup (before you ever start Guided Access)

1. **Turn Bluetooth on** — Control Center, or Settings → Bluetooth.
2. **Open Redline ID** and, on first launch, tap **Allow** on the Bluetooth permission
   prompt.
3. **Tap "Connect portal"**, power on the portal, and roll a car through the gate — confirm
   the needle moves. This proves permission is granted and the radio works.
4. **Enable Guided Access:** Settings → Accessibility → **Guided Access** → on, then set a
   **passcode** (Guided Access → Passcode Settings).

You only do this once. After permission is granted, iOS won't need to prompt again.

---

## Starting a locked race session

1. With Redline ID open **and connected**, **triple-click** the side button (or Home button
   on older devices).
2. In the options panel you can leave **Motion** and **Touch** **on** — neither affects
   Bluetooth. Add a time limit if you like.
3. Tap **Start**.

Guided Access also keeps the screen awake, so the gauge stays live through a whole session.

---

## Troubleshooting

**The speedometer stops registering passes during a session**

- Look for the on-screen banner ("Bluetooth is off" or "Allow Bluetooth") and follow it.
- End Guided Access (triple-click → enter passcode), make sure **Bluetooth is on**,
  reconnect on the home screen, then start Guided Access again.

**iOS won't start Guided Access ("Guided Access could not be started")**

- A pending system dialog is usually the cause. Make sure **Bluetooth is on** (so there's no
  "Turn On Bluetooth" alert waiting) and that you've already granted the Bluetooth
  permission once (see setup above).
- **Force-quit and reopen** Redline ID, confirm it connects, then triple-click to start.
- If it's still stuck, **restart the device** to clear the lingering dialog state.

**Reminder:** none of the Guided Access hardware toggles (Motion, Touch, volume, …) disable
Bluetooth. The connection keeps streaming as long as the app is in the foreground — which
Guided Access guarantees.

---

See also: [Running on your iPhone (dev build)](ios-dev-build.md) ·
[TestFlight & distribution](ios-testflight.md).
