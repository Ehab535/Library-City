package com.citylibrary.app;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // FLAG_SECURE is enforced by Android itself: screenshots are refused,
        // screen recordings and casting show a black screen, and the app
        // preview in the recent-apps switcher is blanked. Set it before the
        // WebView is created so no frame is ever drawn without it.
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );

        // The native Google sign-in plugin needs a FirebaseApp at load time.
        // We build it from res/values/firebase.xml instead of google-services.json.
        if (FirebaseApp.getApps(this).isEmpty()) {
            FirebaseOptions options = new FirebaseOptions.Builder()
                .setApiKey(getString(R.string.cl_firebase_api_key))
                .setApplicationId(getString(R.string.cl_firebase_app_id))
                .setProjectId(getString(R.string.cl_firebase_project_id))
                .setStorageBucket(getString(R.string.cl_firebase_storage_bucket))
                .setGcmSenderId(getString(R.string.cl_firebase_sender_id))
                .build();
            FirebaseApp.initializeApp(this, options);
        }

        super.onCreate(savedInstanceState);
    }
}
