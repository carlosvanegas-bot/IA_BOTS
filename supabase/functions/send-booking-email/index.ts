import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    const { record } = payload;

    if (!record || !record.attendee_email) {
      return new Response(JSON.stringify({ error: "No record found" }), { status: 400 });
    }

    const { attendee_email, meeting_time, subject, id } = record;

    // --- Date formatting (Bogotá UTC-5, no DST) ---
    const date    = new Date(meeting_time);
    const endDate = new Date(date.getTime() + 60 * 60 * 1000); // +1 hora

    const bogotaOffset = -5 * 60 * 60 * 1000;
    const bogotaDate   = new Date(date.getTime() + bogotaOffset);

    const day    = bogotaDate.getUTCDate();
    const monthNames = [
      "enero","febrero","marzo","abril","mayo","junio",
      "julio","agosto","septiembre","octubre","noviembre","diciembre"
    ];
    const month  = monthNames[bogotaDate.getUTCMonth()];
    const year   = bogotaDate.getUTCFullYear();
    let   hours  = bogotaDate.getUTCHours();
    const mins   = bogotaDate.getUTCMinutes().toString().padStart(2, '0');
    const ampm   = hours >= 12 ? 'p. m.' : 'a. m.';
    hours        = hours % 12 || 12;

    const formattedDate = `${day} de ${month} de ${year}, ${hours}:${mins} ${ampm}`;

    // --- ICS calendar attachment ---
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Direktio IA Gems//Booking//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${id}@direktio.com`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(date)}`,
      `DTEND:${fmt(endDate)}`,
      `SUMMARY:${subject}`,
      `ORGANIZER;CN="Direktio IA Gems":mailto:reservas@direktio.com`,
      'DESCRIPTION:Tu espacio ha sido reservado con éxito en Direktio IA Gems.',
      'LOCATION:Virtual / Online',
      `ATTENDEE;RSVP=TRUE;CN="${attendee_email}":mailto:${attendee_email}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    // Base64 encode ICS for attachment
    const icsBase64 = btoa(unescape(encodeURIComponent(icsContent)));

    // --- Send email via Resend ---
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Direktio IA Gems <reservas@direktio.com>',
        to:   [attendee_email],
        subject: `✅ Reserva confirmada: ${subject}`,
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#0D0B1A; font-family:'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0B1A; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(138,43,226,0.15),rgba(0,0,0,0.6)); border:1px solid rgba(138,43,226,0.3); border-radius:16px; overflow:hidden; max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#8A2BE2,#B200FF); padding:30px; text-align:center;">
              <h1 style="margin:0; color:#fff; font-size:22px; letter-spacing:1px;">DIREKTIO IA GEMS</h1>
              <p style="margin:6px 0 0; color:rgba(255,255,255,0.8); font-size:14px;">Sistema de Agendamiento</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 8px; color:#00E5FF; font-size:20px;">✅ Reserva Confirmada</h2>
              <p style="color:#A09DB0; font-size:14px; margin:0 0 28px;">Tu cita ha quedado registrada exitosamente. Aquí están los detalles:</p>

              <!-- Detail card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,229,255,0.06); border:1px solid rgba(0,229,255,0.2); border-radius:12px; border-left:4px solid #00E5FF;">
                <tr>
                  <td style="padding:24px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
                          <span style="color:#A09DB0; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Asunto</span><br>
                          <span style="color:#fff; font-size:16px; font-weight:600;">${subject}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
                          <span style="color:#A09DB0; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Fecha y Hora</span><br>
                          <span style="color:#fff; font-size:16px; font-weight:600;">📅 ${formattedDate} (Bogotá)</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#A09DB0; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Modalidad</span><br>
                          <span style="color:#fff; font-size:16px; font-weight:600;">🌐 Virtual / Online</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#A09DB0; font-size:13px; margin:28px 0 0; line-height:1.6;">
                📎 Adjuntamos un archivo <strong style="color:#fff;">.ics</strong> para que puedas agregar esta cita directamente a tu calendario (Google Calendar, Outlook, Apple Calendar).
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(0,0,0,0.3); padding:20px 40px; text-align:center; border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0; color:#605D70; font-size:12px;">
                © ${year} Direktio IA Gems · <a href="https://direktio.com" style="color:#8A2BE2; text-decoration:none;">direktio.com</a>
              </p>
              <p style="margin:6px 0 0; color:#605D70; font-size:11px;">Si no realizaste esta reserva, puedes ignorar este mensaje.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
        attachments: [
          {
            filename: 'reserva-direktio.ics',
            content:  icsBase64,
          }
        ]
      }),
    });

    const data = await res.json();
    console.log("📧 Resend API Response:", JSON.stringify(data));

    if (!res.ok) {
      throw new Error(data.message || `Resend error: ${res.status}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Exception:", error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
})
