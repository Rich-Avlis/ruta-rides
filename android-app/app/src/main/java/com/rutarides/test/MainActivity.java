package com.rutarides.test;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private static final String PREFS = "ruta_rides";
    private static final String KEY_URL = "server_url";
    private static final String DEFAULT_URL = "https://ruta-rides.vercel.app";

    private SharedPreferences prefs;
    private TextView status;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

        if (prefs.getInt("config_version", 0) < 2) {
            prefs.edit()
                    .putString(KEY_URL, DEFAULT_URL)
                    .putInt("config_version", 2)
                    .apply();
        }

        String intentUrl = getIntent().getStringExtra("server_url");
        if (intentUrl != null && !intentUrl.isEmpty()) {
            prefs.edit().putString(KEY_URL, intentUrl).apply();
        }

        showStartScreen();
    }

    private void showStartScreen() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setPadding(64, 64, 64, 64);
        layout.setBackgroundColor(Color.rgb(243, 243, 240));

        TextView title = new TextView(this);
        title.setText("RUTA RIDES");
        title.setTextSize(34);
        title.setTextColor(Color.rgb(11, 11, 11));
        title.setGravity(Gravity.CENTER);
        layout.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("Prueba local");
        subtitle.setTextSize(14);
        subtitle.setTextColor(Color.rgb(95, 95, 95));
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setPadding(0, 0, 0, 32);
        layout.addView(subtitle);

        status = new TextView(this);
        status.setText("Servidor:\n" + prefs.getString(KEY_URL, DEFAULT_URL));
        status.setTextSize(13);
        status.setTextColor(Color.rgb(95, 95, 95));
        status.setGravity(Gravity.CENTER);
        status.setPadding(0, 0, 0, 24);
        layout.addView(status);

        Button open = new Button(this);
        open.setText("Abrir RUTA RIDES");
        open.setAllCaps(false);
        open.setOnClickListener(v -> openInBrowser(prefs.getString(KEY_URL, DEFAULT_URL)));
        layout.addView(open, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        Button change = new Button(this);
        change.setText("Cambiar servidor");
        change.setAllCaps(false);
        change.setOnClickListener(v -> showServerDialog(null));
        layout.addView(change, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        TextView help = new TextView(this);
        help.setText("Se abrirá en el navegador del teléfono.\n"
                + "Teléfono: usa la IP de tu computadora en la misma red.\n"
                + "Emulador: 10.0.2.2.\n"
                + "La ubicación GPS requiere HTTPS; si no está disponible, "
                + "fija el origen tocando el mapa.");
        help.setTextSize(11);
        help.setTextColor(Color.rgb(95, 95, 95));
        help.setGravity(Gravity.CENTER);
        help.setPadding(0, 32, 0, 0);
        layout.addView(help);

        setContentView(layout);
    }

    private void openInBrowser(String url) {
        status.setText("Probando " + url + "…");

        new Thread(() -> {
            String failure = null;

            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);
                connection.setRequestMethod("HEAD");
                int code = connection.getResponseCode();
                connection.disconnect();

                if (code >= 400) {
                    failure = "HTTP " + code;
                }
            } catch (Exception error) {
                failure = error.getMessage() != null ? error.getMessage() : "sin conexión";
            }

            final String finalFailure = failure;
            runOnUiThread(() -> {
                if (finalFailure == null) {
                    launchBrowser(url);
                } else {
                    status.setText("No se pudo conectar con el servidor.\nRevisa la IP y que la app esté encendida.");
                    showServerDialog("Error: " + finalFailure);
                }
            });
        }).start();
    }

    private void launchBrowser(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception error) {
            showServerDialog("No hay navegador disponible");
        }
    }

    private void showServerDialog(String message) {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(48, 24, 48, 0);

        if (message != null) {
            TextView error = new TextView(this);
            error.setText(message);
            error.setTextColor(0xFFB84A0C);
            error.setPadding(0, 0, 0, 16);
            layout.addView(error);
        }

        TextView label = new TextView(this);
        label.setText("URL del servidor RUTA RIDES");
        label.setPadding(0, 0, 0, 8);
        layout.addView(label);

        EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setHint(DEFAULT_URL);
        input.setText(prefs.getString(KEY_URL, DEFAULT_URL));
        input.setSingleLine(true);
        layout.addView(input, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        Button emulator = new Button(this);
        emulator.setText("Usar emulador (10.0.2.2)");
        emulator.setAllCaps(false);
        emulator.setOnClickListener(v -> input.setText("http://10.0.2.2:3200"));
        layout.addView(emulator);

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("RUTA RIDES")
                .setView(layout)
                .setPositiveButton("Guardar", null)
                .setNegativeButton("Cancelar", null)
                .create();

        dialog.setOnShowListener(d -> dialog.getButton(AlertDialog.BUTTON_POSITIVE)
                .setOnClickListener(v -> {
                    String url = input.getText().toString().trim();
                    if (url.isEmpty()) {
                        url = DEFAULT_URL;
                    }
                    if (!url.startsWith("http://") && !url.startsWith("https://")) {
                        url = "http://" + url;
                    }
                    prefs.edit().putString(KEY_URL, url).apply();
                    status.setText("Servidor:\n" + url);
                    dialog.dismiss();
                }));

        dialog.show();
    }
}
