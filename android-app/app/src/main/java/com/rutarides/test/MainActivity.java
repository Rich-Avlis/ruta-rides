package com.rutarides.test;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;

import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private static final String PREFS = "ruta_rides";
    private static final String KEY_URL = "server_url";
    private static final String DEFAULT_URL = "https://ruta-rides.vercel.app";
    private static final String API_HEALTH = "https://ruta-rides-api.onrender.com/health";
    private static final int REQUEST_LOCATION = 1001;
    private static final int REQUEST_FILE = 1002;

    private SharedPreferences prefs;
    private WebView webView;
    private View splash;
    private LinearLayout errorView;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingGeoOrigin;
    private GeolocationPermissions.Callback pendingGeoCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (prefs.getInt("config_version", 0) < 3) {
            prefs.edit()
                    .putString(KEY_URL, DEFAULT_URL)
                    .putInt("config_version", 3)
                    .apply();
        }

        webView = findViewById(R.id.webView);
        splash = findViewById(R.id.splash);
        errorView = findViewById(R.id.errorView);

        Button retry = findViewById(R.id.retryButton);
        retry.setOnClickListener(v -> {
            errorView.setVisibility(View.GONE);
            splash.setVisibility(View.VISIBLE);
            webView.setVisibility(View.VISIBLE);
            webView.reload();
        });

        configureWebView();
        requestLocationPermission();
        warmUpBackend();
        webView.loadUrl(serverUrl());
    }

    /** Despierta el backend gratuito de Render mientras carga la interfaz. */
    private void warmUpBackend() {
        new Thread(() -> {
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(API_HEALTH).openConnection();
                connection.setConnectTimeout(25000);
                connection.setReadTimeout(25000);
                connection.setRequestMethod("GET");
                connection.getResponseCode();
                connection.disconnect();
            } catch (Exception ignored) {
                // Si falla, la app muestra su pantalla de reintento.
            }
        }).start();
    }

    private String serverUrl() {
        String intentUrl = getIntent().getStringExtra("server_url");
        if (intentUrl != null && !intentUrl.isEmpty()) {
            prefs.edit().putString(KEY_URL, intentUrl).apply();
        }
        String url = prefs.getString(KEY_URL, DEFAULT_URL);
        return url == null || url.isEmpty() ? DEFAULT_URL : url;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.setBackgroundColor(0xFFFFFFFF);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl());
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                errorView.setVisibility(View.GONE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                splash.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    showError();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (hasLocationPermission()) {
                    callback.invoke(origin, true, false);
                    return;
                }
                pendingGeoOrigin = origin;
                pendingGeoCallback = callback;
                requestLocationPermission();
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }
                fileCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(intent, REQUEST_FILE);
                    return true;
                } catch (Exception error) {
                    fileCallback = null;
                    return false;
                }
            }
        });
    }

    private boolean handleUrl(Uri uri) {
        if (uri == null) {
            return false;
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme();
        String host = uri.getHost() == null ? "" : uri.getHost();
        String baseHost = Uri.parse(serverUrl()).getHost();

        boolean internal = ("https".equals(scheme) || "http".equals(scheme))
                && baseHost != null
                && (host.equals(baseHost) || host.endsWith("." + baseHost));
        if (internal) {
            return false;
        }

        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
            // Sin app disponible para el enlace.
        }
        return true;
    }

    private void showError() {
        splash.setVisibility(View.GONE);
        webView.setVisibility(View.GONE);
        errorView.setVisibility(View.VISIBLE);
    }

    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestLocationPermission() {
        if (hasLocationPermission()) {
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            requestPermissions(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
            }, REQUEST_LOCATION);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_LOCATION && pendingGeoCallback != null) {
            boolean granted = grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_FILE && fileCallback != null) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    result = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        result[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    result = new Uri[]{data.getData()};
                }
            }
            fileCallback.onReceiveValue(result);
            fileCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
