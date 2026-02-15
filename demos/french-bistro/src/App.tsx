import { useState, useCallback, useRef } from "react";
import {
  WebMCPProvider,
  WebMCPForm,
  WebMCPInput,
  WebMCPSelect,
  WebMCPTextarea,
  useToolEvent,
} from "react-webmcp";
import type { WebMCPFormSubmitEvent } from "react-webmcp";
import "./App.css";

interface ValidationError {
  field: string;
  value: string;
  message: string;
}

function ReservationForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDialog, setShowDialog] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const validate = useCallback((): ValidationError[] => {
    const errs: ValidationError[] = [];
    const form = formRef.current;
    if (!form) return errs;

    const data = new FormData(form);
    const name = (data.get("name") as string) || "";
    const phone = (data.get("phone") as string) || "";
    const date = (data.get("date") as string) || "";
    const time = (data.get("time") as string) || "";

    const errMap: Record<string, string> = {};

    if (name.trim().length < 2) {
      const msg = "Please enter a valid name (at least 2 characters).";
      errs.push({ field: "name", value: name, message: msg });
      errMap.name = msg;
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      const msg = "Please enter a valid phone number (minimum 10 digits).";
      errs.push({ field: "phone", value: phone, message: msg });
      errMap.phone = msg;
    }

    if (!date) {
      const msg = "Please select a future date.";
      errs.push({ field: "date", value: date, message: msg });
      errMap.date = msg;
    } else {
      const d = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) {
        const msg = "Please select a future date.";
        errs.push({ field: "date", value: date, message: msg });
        errMap.date = msg;
      }
    }

    if (!time) {
      const msg = "Please select a valid time.";
      errs.push({ field: "time", value: time, message: msg });
      errMap.time = msg;
    }

    setErrors(errMap);
    return errs;
  }, []);

  // Listen for tool activation to run pre-validation
  useToolEvent(
    "toolactivated",
    useCallback(() => {
      validate();
    }, [validate]),
    "book_table_le_petit_bistro",
  );

  const handleSubmit = useCallback(
    (e: WebMCPFormSubmitEvent) => {
      e.preventDefault();

      const validationErrors = validate();

      if (validationErrors.length > 0) {
        if (e.agentInvoked) {
          e.respondWith(Promise.resolve(validationErrors));
        }
        return;
      }

      // Build confirmation text
      const form = formRef.current!;
      const data = new FormData(form);
      const name = data.get("name") as string;
      const date = new Date(data.get("date") as string);
      const time = data.get("time") as string;
      const guests =
        form.querySelector<HTMLSelectElement>("#guests")?.selectedOptions[0]
          ?.textContent || "";
      const seating =
        form.querySelector<HTMLSelectElement>("#seating")?.selectedOptions[0]
          ?.textContent || "";

      const dateStr = date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      const text = `Hello ${name}, We look forward to welcoming you on: ${dateStr} at ${time}, Party of ${guests}, ${seating}`;
      setConfirmationText(text);
      setShowDialog(true);

      if (e.agentInvoked) {
        e.respondWith(Promise.resolve(text));
      }
    },
    [validate],
  );

  const handleCloseDialog = () => {
    setShowDialog(false);
    formRef.current?.reset();
    setErrors({});
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <div className="booking-container">
        <h2>Le Petit Bistro</h2>
        <span className="subtitle">Table Reservations</span>

        <WebMCPForm
          ref={formRef as React.Ref<HTMLFormElement>}
          id="reservationForm"
          toolName="book_table_le_petit_bistro"
          toolDescription="Creates a confirmed dining reservation at Le Petit Bistro. Accepts customer details, timing, and seating preferences."
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <WebMCPInput
              type="text"
              id="name"
              name="name"
              placeholder="e.g. Alexander Hamilton"
              required
              minLength={2}
              toolParamDescription="Customer's full name (min 2 chars)"
              className={errors.name ? "invalid" : ""}
            />
            {errors.name && <span className="error-msg">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <WebMCPInput
              type="tel"
              id="phone"
              name="phone"
              placeholder="(555) 000-0000"
              required
              toolParamDescription="Customer's phone number (min 10 digits)"
              className={errors.phone ? "invalid" : ""}
            />
            {errors.phone && <span className="error-msg">{errors.phone}</span>}
          </div>

          <div className="form-group row">
            <div className="col">
              <label htmlFor="date">Date</label>
              <WebMCPInput
                type="date"
                id="date"
                name="date"
                required
                min={today}
                toolParamDescription="Reservation date (YYYY-MM-DD). Must be today or future."
                className={errors.date ? "invalid" : ""}
              />
              {errors.date && <span className="error-msg">{errors.date}</span>}
            </div>
            <div className="col">
              <label htmlFor="time">Time</label>
              <WebMCPInput
                type="time"
                id="time"
                name="time"
                required
                toolParamDescription="Reservation time (HH:MM)"
                className={errors.time ? "invalid" : ""}
              />
              {errors.time && <span className="error-msg">{errors.time}</span>}
            </div>
          </div>

          <div className="form-group row">
            <div className="col">
              <label htmlFor="guests">Guests</label>
              <WebMCPSelect
                id="guests"
                name="guests"
                required
                toolParamDescription="Number of people dining. Must be a string value between '1' and '5', or '6' for parties of 6 or more."
              >
                <option value="1">1 Person</option>
                <option value="2">2 People</option>
                <option value="3">3 People</option>
                <option value="4">4 People</option>
                <option value="5">5 People</option>
                <option value="6">6 People or more</option>
              </WebMCPSelect>
            </div>
            <div className="col">
              <label htmlFor="seating">Seating Preference</label>
              <WebMCPSelect
                id="seating"
                name="seating"
                toolParamDescription="Preferred seating area"
              >
                <option value="Main Dining">Main Dining Room</option>
                <option value="Terrace">Terrace (Outdoor)</option>
                <option value="Private Booth">Private Booth</option>
                <option value="Bar">Bar Counter</option>
              </WebMCPSelect>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="requests">Special Requests</label>
            <WebMCPTextarea
              id="requests"
              name="requests"
              rows={2}
              placeholder="Allergies, anniversaries, high chair..."
              toolParamDescription="Special requests (allergies, occasions, etc.)"
            />
          </div>

          <button type="submit" className="submit-btn">
            Request Reservation
          </button>
        </WebMCPForm>
      </div>

      {showDialog && (
        <div className="dialog-overlay" onClick={handleCloseDialog}>
          <dialog open className="booking-dialog">
            <h3 className="modal-title">Reservation Received</h3>
            <p style={{ fontStyle: "italic", color: "#666", marginTop: 0 }}>
              Bon App&eacute;tit!
            </p>
            <div className="modal-details">{confirmationText}</div>
            <button className="close-modal-btn" onClick={handleCloseDialog}>
              Close Window
            </button>
          </dialog>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <WebMCPProvider>
      <ReservationForm />
    </WebMCPProvider>
  );
}
