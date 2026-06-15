import os

def get_default_portal_id(provided_address: str | None = None) -> str | None:
    """
    Returns the portal ID (MAC address) to use.
    If provided_address is given (usually from command line args), it is used.
    Otherwise, if the HW_PORTAL_ID environment variable is set, it is used
    and a message is printed to inform the user.
    """
    if provided_address is not None:
        return provided_address
        
    env_id = os.environ.get("HW_PORTAL_ID")
    if env_id:
        print(f"Using portal ID from HW_PORTAL_ID env var ({env_id}).")
        return env_id
        
    return None
