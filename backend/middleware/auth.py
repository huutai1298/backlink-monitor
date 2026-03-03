import os
from fastapi import HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

_http_bearer = HTTPBearer()


def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(_http_bearer),
) -> dict:
    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
