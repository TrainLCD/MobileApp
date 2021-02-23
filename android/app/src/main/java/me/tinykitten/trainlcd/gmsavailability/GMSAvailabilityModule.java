package me.tinykitten.trainlcd.gmsavailability;

import android.content.Context;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.google.android.gms.common.GoogleApiAvailability;

import javax.annotation.Nonnull;

public class GMSAvailabilityModule extends ReactContextBaseJavaModule {
  public GMSAvailabilityModule (@Nonnull ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Nonnull
  @Override
  public String getName() {
    return "GMSAvailability";
  }

  @ReactMethod
  public void isGMSAvailable(Promise promise) {
    boolean isAvailable = false;
    Context context = getReactApplicationContext();
    if (null != context) {
      int result = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context);
      isAvailable = (com.google.android.gms.common.ConnectionResult.SUCCESS == result);
    }

    Log.i("GMS Utils", "isGMSAvailable: " + isAvailable);
    promise.resolve(isAvailable);
  }
}
