import { useState } from "react";
import Reveal from "../About/shared/Reveal";
import Label from "../About/shared/Label";
import FormField from "../shared/FormField";
import FormSuccess from "../shared/FormSuccess";
import SubmitButton from "../shared/SubmitButton";
import { api } from "../../services/api";

const empty = { name: "", email: "", phone: "", message: "" };

export default function ContactForm() {
  const [values, setValues] = useState(empty);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) =>
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try { await api.post("/contact", values); setSent(true); } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const reset = () => {
    setValues(empty);
    setSent(false);
  };

  return (
    <Reveal className="bg-[#f6f2ec] p-8 sm:p-12">
      {sent ? (
        <FormSuccess
          title="Thank you"
          text="Your message has reached us. A member of our team will reply within one working day."
          onReset={reset}
        />
      ) : (
        <>
          <Label>Send a message</Label>
          <h2 className="mt-4 font-serif text-3xl font-light uppercase tracking-[0.08em] text-[#171512]">
            How can we help?
          </h2>
          <form onSubmit={onSubmit} className="mt-10 space-y-8">
            <FormField label="Name" id="name" required value={values.name} onChange={onChange} placeholder="Your full name" autoComplete="name" />
            <div className="grid gap-8 sm:grid-cols-2">
              <FormField label="Email" id="email" type="email" required value={values.email} onChange={onChange} placeholder="you@example.com" autoComplete="email" />
              <FormField label="Phone" id="phone" type="tel" value={values.phone} onChange={onChange} placeholder="Optional" autoComplete="tel" />
            </div>
            <FormField label="Message" id="message" as="textarea" rows={4} required value={values.message} onChange={onChange} placeholder="Tell us a little about what you have in mind" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <SubmitButton disabled={loading}>{loading ? "Sending…" : "Send message"}</SubmitButton>
          </form>
        </>
      )}
    </Reveal>
  );
}
