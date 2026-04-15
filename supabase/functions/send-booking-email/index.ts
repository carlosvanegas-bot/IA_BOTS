import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  // Solo permitir POST
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
    const date = new Date(meeting_time); // UTC
    const endDate = new Date(date.getTime() + 60 * 60 * 1000); // 1 hora después

    // Ajuste manual para Bogotá (UTC-5) - No hay horario de verano
    const bogotaOffset = -5 * 60 * 60 * 1000;
    const bogotaDate = new Date(date.getTime() + bogotaOffset);

    const day = bogotaDate.getUTCDate();
    const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const month = monthNames[bogotaDate.getUTCMonth()];
    const year = bogotaDate.getUTCFullYear();
    let hours = bogotaDate.getUTCHours();
    const minutes = bogotaDate.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
    hours = hours % 12;
    hours = hours ? hours : 12; 

    const manualFormattedDate = `${day} de ${month} de ${year}, ${hours}:${minutes} ${ampm}`;


    // Formatear fecha para ICS: YYYYMMDDTHHMMSSZ
    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Direktio IA Gems//Booking//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${id}`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(date)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${subject}`,
      `ORGANIZER;CN="Direktio":mailto:reservas@direktio.com`,
      'DESCRIPTION:Tu espacio ha sido reservado con éxito en Direktio IA Gems.',
      'LOCATION:Virtual / Online',
      `ATTENDEE;RSVP=TRUE:mailto:${attendee_email}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const emailResponse = await resend.emails.send({
      from: 'Direktio <reservas@direktio.com>',
      to: attendee_email,
      subject: 'Reserva Confirmada Platzi',
      html: `Hola, hemos recibido tu solicitud. Tu espacio ha sido reservado con éxito.`,
      attachments: [
        {
          filename: 'reserva_cita.ics',
          content: btoa(icsContent),
        },
      ],
    });


    // Notificación para el administrador (mantenida por seguridad)
    await resend.emails.send({
      from: 'IA Gems Notifier <reservas@direktio.com>',
      to: 'carlos.vanegas@direktio.com',
      subject: `NUEVA RESERVA: ${subject} (${attendee_email})`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; border-left: 5px solid #39FF14;">
          <h2 style="color: #39FF14;">¡Nueva reserva detectada!</h2>
          <p>Se ha registrado una nueva cita en el sistema:</p>
          <ul>
            <li><strong>Cliente:</strong> ${attendee_email}</li>
            <li><strong>Asunto:</strong> ${subject}</li>
            <li><strong>Fecha:</strong> ${manualFormattedDate} (Bogotá)</li>
          </ul>

        </div>
      `,
    });

    return new Response(JSON.stringify(emailResponse), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
})
