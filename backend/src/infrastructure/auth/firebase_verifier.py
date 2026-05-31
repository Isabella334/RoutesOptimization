import os
import firebase_admin
from firebase_admin import auth as firebase_auth

class FirebaseTokenVerifier:
    def verify(self, token: str) -> dict:
        if not firebase_admin._apps:
            firebase_admin.initialize_app(options={
                "projectId": os.environ.get("FIREBASE_PROJECT_ID", "routesoptimizer-53444")
            })
        return firebase_auth.verify_id_token(token)
