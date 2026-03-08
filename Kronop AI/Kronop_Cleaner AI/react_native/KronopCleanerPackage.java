package com.kronop;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * KronopCleanerPackage - React Native Package
 * Exposes Kronop Cleaner AI native functionality to React Native
 */
public class KronopCleanerPackage implements ReactPackage {

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        
        // Add Kronop Native Interface
        modules.add(new KronopNativeInterface(reactContext));
        
        // Add any additional modules here
        
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        // No custom views for now
        return Collections.emptyList();
    }

    @Override
    public List<String> createJSModules() {
        // No JS modules for now
        return Collections.emptyList();
    }
}
