from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from infrastructure import FirebaseTokenVerifier

_bearer = HTTPBearer(auto_error=False)
_verifier = FirebaseTokenVerifier()

def require_auth(credentials: HTTPAuthorizationCredentials | None = Security(_bearer)) -> None:
    if not credentials:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        _verifier.verify(credentials.credentials)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
