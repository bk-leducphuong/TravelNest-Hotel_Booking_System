package email

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"html/template"
	"log/slog"
	"mime"
	"net/smtp"
	"strconv"
	"strings"
	"time"
)

type Mailer struct {
	host       string
	port       string
	secure     bool
	username   string
	password   string
	skipVerify bool
	from       string
	clientHost string
	logger     *slog.Logger
}

type Config struct {
	Host             string
	Port             string
	Secure           bool
	Username         string
	Password         string
	SkipVerify       bool
	DefaultFromEmail string
	ClientHost       string
	Logger           *slog.Logger
}

type EmailRequest struct {
	Type      string
	Email     string
	Subject   string
	Variables map[string]any
}

func NewMailer(cfg Config) *Mailer {
	from := cfg.DefaultFromEmail
	if from == "" {
		from = cfg.Username
	}
	return &Mailer{
		host:       cfg.Host,
		port:       cfg.Port,
		secure:     cfg.Secure,
		username:   cfg.Username,
		password:   cfg.Password,
		skipVerify: cfg.SkipVerify,
		from:       from,
		clientHost: strings.TrimRight(cfg.ClientHost, "/"),
		logger:     cfg.Logger,
	}
}

func (m *Mailer) Enabled() bool {
	return m.host != "" && m.port != "" && m.from != ""
}

func (m *Mailer) Send(req EmailRequest) error {
	if !m.Enabled() {
		return fmt.Errorf("smtp is not configured")
	}

	switch req.Type {
	case "booking_confirmation":
		return m.sendBookingConfirmation(req)
	case "payment_failure":
		return m.sendPaymentFailure(req)
	case "test_broadcast":
		return m.sendTestBroadcast(req)
	default:
		return fmt.Errorf("unsupported email request type: %s", req.Type)
	}
}

func (m *Mailer) sendBookingConfirmation(req EmailRequest) error {
	data := map[string]any{
		"buyerName":         stringValue(req.Variables["buyerName"], "Guest"),
		"bookingCode":       stringValue(req.Variables["bookingCode"], "N/A"),
		"hotelName":         stringValue(req.Variables["hotelName"], "Our Hotel"),
		"roomType":          stringValue(req.Variables["roomType"], "Standard Room"),
		"checkInDate":       formatDate(req.Variables["checkInDate"]),
		"checkOutDate":      formatDate(req.Variables["checkOutDate"]),
		"numberOfGuests":    intValue(req.Variables["numberOfGuests"], 1),
		"totalPrice":        formatPrice(req.Variables["totalPrice"], stringValue(req.Variables["currency"], "USD")),
		"bookingDetailsUrl": fmt.Sprintf("%s/booking/%s", m.clientHost, stringValue(req.Variables["bookingCode"], "")),
	}

	subject := req.Subject
	if subject == "" {
		subject = fmt.Sprintf("Booking Confirmation - %s", data["bookingCode"])
	}

	html, err := renderTemplate(bookingConfirmationTemplate, data)
	if err != nil {
		return err
	}
	return m.sendHTML(req.Email, subject, html)
}

func (m *Mailer) sendPaymentFailure(req EmailRequest) error {
	data := map[string]any{
		"buyerName":      stringValue(req.Variables["buyerName"], "Guest"),
		"bookingCode":    stringValue(req.Variables["bookingCode"], ""),
		"failureMessage": stringValue(req.Variables["failureMessage"], "Payment processing failed. Please try again."),
		"retryUrl":       fmt.Sprintf("%s/book", m.clientHost),
		"year":           time.Now().Year(),
	}

	subject := req.Subject
	if subject == "" {
		subject = "Payment Failed - Action Required"
	}

	html, err := renderTemplate(paymentFailureTemplate, data)
	if err != nil {
		return err
	}
	return m.sendHTML(req.Email, subject, html)
}

func (m *Mailer) sendTestBroadcast(req EmailRequest) error {
	data := map[string]any{
		"recipientName": stringValue(req.Variables["recipientName"], "Traveler"),
		"message":       stringValue(req.Variables["message"], ""),
		"year":          time.Now().Year(),
	}

	subject := req.Subject
	if subject == "" {
		subject = "TravelNest Notification Test"
	}

	html, err := renderTemplate(testBroadcastTemplate, data)
	if err != nil {
		return err
	}
	return m.sendHTML(req.Email, subject, html)
}

func (m *Mailer) sendHTML(to, subject, html string) error {
	if to == "" || subject == "" || html == "" {
		return fmt.Errorf("missing required email fields")
	}

	message := buildMessage(m.from, to, subject, html)
	addr := m.host + ":" + m.port
	if m.secure {
		return m.sendSecure(addr, to, message)
	}
	return m.sendStartTLS(addr, to, message)
}

func (m *Mailer) sendSecure(addr, to string, message []byte) error {
	conn, err := tls.Dial("tcp", addr, &tls.Config{
		ServerName:         m.host,
		InsecureSkipVerify: m.skipVerify,
	})
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, m.host)
	if err != nil {
		return err
	}
	defer client.Quit()

	if m.shouldAuthenticate() {
		if ok, _ := client.Extension("AUTH"); ok {
			if err := client.Auth(smtp.PlainAuth("", m.username, m.password, m.host)); err != nil {
				return err
			}
		}
	}
	return writeMail(client, m.from, to, message)
}

func (m *Mailer) sendStartTLS(addr, to string, message []byte) error {
	client, err := smtp.Dial(addr)
	if err != nil {
		return err
	}
	defer client.Quit()

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{
			ServerName:         m.host,
			InsecureSkipVerify: m.skipVerify,
		}); err != nil {
			return err
		}
	}

	if ok, _ := client.Extension("AUTH"); ok && m.shouldAuthenticate() {
		if err := client.Auth(smtp.PlainAuth("", m.username, m.password, m.host)); err != nil {
			return err
		}
	}

	return writeMail(client, m.from, to, message)
}

func (m *Mailer) shouldAuthenticate() bool {
	return m.username != "" || m.password != ""
}

func writeMail(client *smtp.Client, from, to string, message []byte) error {
	if err := client.Mail(from); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	writer, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := writer.Write(message); err != nil {
		_ = writer.Close()
		return err
	}
	return writer.Close()
}

func buildMessage(from, to, subject, html string) []byte {
	var buffer bytes.Buffer
	buffer.WriteString(fmt.Sprintf("From: %s\r\n", from))
	buffer.WriteString(fmt.Sprintf("To: %s\r\n", to))
	buffer.WriteString(fmt.Sprintf("Subject: %s\r\n", mime.QEncoding.Encode("utf-8", subject)))
	buffer.WriteString("MIME-Version: 1.0\r\n")
	buffer.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	buffer.WriteString("\r\n")
	buffer.WriteString(html)
	return buffer.Bytes()
}

func renderTemplate(source string, data map[string]any) (string, error) {
	tpl, err := template.New("email").Parse(source)
	if err != nil {
		return "", err
	}
	var buffer bytes.Buffer
	if err := tpl.Execute(&buffer, data); err != nil {
		return "", err
	}
	return buffer.String(), nil
}

func stringValue(value any, fallback string) string {
	if value == nil {
		return fallback
	}
	switch v := value.(type) {
	case string:
		if v == "" {
			return fallback
		}
		return v
	default:
		return fmt.Sprintf("%v", value)
	}
}

func intValue(value any, fallback int) int {
	switch v := value.(type) {
	case int:
		return v
	case int32:
		return int(v)
	case int64:
		return int(v)
	case float64:
		return int(v)
	default:
		return fallback
	}
}

func formatPrice(value any, currency string) string {
	var amount float64
	switch v := value.(type) {
	case int:
		amount = float64(v)
	case int64:
		amount = float64(v)
	case float64:
		amount = v
	case string:
		parsed, err := strconv.ParseFloat(v, 64)
		if err == nil {
			amount = parsed
		}
	}
	if strings.EqualFold(currency, "USD") {
		amount = amount / 100
	}
	return fmt.Sprintf("%s %.2f", strings.ToUpper(currency), amount)
}

func formatDate(value any) string {
	switch v := value.(type) {
	case string:
		if t, err := time.Parse("2006-01-02", v); err == nil {
			return t.Format("January 2, 2006")
		}
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			return t.Format("January 2, 2006")
		}
		return v
	default:
		return fmt.Sprintf("%v", value)
	}
}

const bookingConfirmationTemplate = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Thank You for Your Booking</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background-color: #003580; padding: 20px; text-align: center; color: white; font-size: 24px; font-weight: bold;">TravelNest</div>
      <div style="padding: 40px 30px;">
        <h1 style="color: #003580;">Thank You for Your Booking!</h1>
        <p>Dear {{.buyerName}},</p>
        <p>Thank you for choosing our hotel for your upcoming stay. We are delighted to confirm your reservation.</p>
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 20px 0;">
          <p><strong>Booking Code:</strong> {{.bookingCode}}</p>
          <p><strong>Hotel:</strong> {{.hotelName}}</p>
          <p><strong>Room Type:</strong> {{.roomType}}</p>
          <p><strong>Check-in:</strong> {{.checkInDate}}</p>
          <p><strong>Check-out:</strong> {{.checkOutDate}}</p>
          <p><strong>Guests:</strong> {{.numberOfGuests}} Adults</p>
        </div>
        <p><strong>Total Amount:</strong> {{.totalPrice}}</p>
        <p><a href="{{.bookingDetailsUrl}}" style="display: inline-block; padding: 12px 30px; background-color: #003580; color: white; text-decoration: none; border-radius: 4px;">View Booking Details</a></p>
        <p>Best regards,<br />The TravelNest Team</p>
      </div>
    </div>
  </body>
</html>`

const paymentFailureTemplate = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Payment Failed</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background-color: #dc3545; padding: 20px; text-align: center; color: white; font-size: 24px; font-weight: bold;">TravelNest</div>
      <div style="padding: 40px 30px;">
        <h1>Payment Failed</h1>
        <p>Dear {{.buyerName}},</p>
        <p>We regret to inform you that your payment could not be processed.</p>
        {{if .bookingCode}}<p><strong>Booking Code:</strong> {{.bookingCode}}</p>{{end}}
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; margin: 20px 0; color: #721c24;"><strong>Error:</strong> {{.failureMessage}}</div>
        <p><a href="{{.retryUrl}}" style="display: inline-block; padding: 12px 30px; background-color: #003580; color: white; text-decoration: none; border-radius: 4px;">Try Again</a></p>
        <p>Best regards,<br />The TravelNest Team</p>
        <p style="font-size: 12px; color: #666;">© {{.year}} TravelNest. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`

const testBroadcastTemplate = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TravelNest Notification Test</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background-color: #0f5d5e; padding: 20px; text-align: center; color: white; font-size: 24px; font-weight: bold;">TravelNest</div>
      <div style="padding: 40px 30px;">
        <h1>Notification Workflow Test</h1>
        <p>Hello {{.recipientName}},</p>
        <p>This is an internal test email sent through the TravelNest notification service.</p>
        <div style="background-color: #f2f7f7; border-left: 4px solid #0f5d5e; padding: 16px; margin: 20px 0;">
          {{.message}}
        </div>
        <p>If you received this message unexpectedly, no action is required.</p>
        <p>Best regards,<br />The TravelNest Team</p>
        <p style="font-size: 12px; color: #666;">© {{.year}} TravelNest. Internal testing email.</p>
      </div>
    </div>
  </body>
</html>`
