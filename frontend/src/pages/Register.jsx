import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/common/Logo";
import { useAuth } from "../context/AuthContext";
import styles from "./Auth.module.css";

const FormField = ({
  id,
  label,
  type = "text",
  placeholder,
  autoComplete,
  form,
  setForm,
  errors,
  setErrors,
}) => {
  const fieldValue = form[id] || "";

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        type={type}
        className={`form-input ${errors[id] ? "error" : ""}`}
        placeholder={placeholder}
        value={fieldValue}
        onChange={(e) => {
          const newValue = e.target.value;
          setForm((prev) => ({ ...prev, [id]: newValue }));
          // Clear error for this field when user starts typing
          if (errors[id]) {
            setErrors((prev) => ({ ...prev, [id]: "" }));
          }
        }}
        autoComplete={autoComplete}
      />
      {errors[id] && <span className="form-error">{errors[id]}</span>}
    </div>
  );
};

const PasswordStrengthIndicator = ({ password }) => {
  const getStrength = () => {
    if (!password) return { score: 0, label: "", color: "var(--border)" };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 1, label: "Weak", color: "#dc2626" };
    if (score <= 3) return { score: 2, label: "Fair", color: "#f59e0b" };
    if (score <= 4) return { score: 3, label: "Good", color: "#3b82f6" };
    return { score: 4, label: "Strong", color: "#16a34a" };
  };

  const strength = getStrength();
  if (!password) return null;

  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "4px",
              borderRadius: "2px",
              backgroundColor:
                i <= strength.score ? strength.color : "var(--border)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
      <span
        style={{ fontSize: "12px", color: strength.color, fontWeight: 600 }}
      >
        {strength.label}
      </span>
    </div>
  );
};

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    licenseKey: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 6)
      errs.password = "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.licenseKey);
      toast.success("Account created! Welcome to Duka Profit 🎉");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <Logo size="large" />

        <div className={styles.authHeader}>
          <h1>{t("createAccount")}</h1>
          <p>Start tracking your profits today</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <FormField
            id="name"
            label={t("name")}
            placeholder="Jane Uwimana"
            autoComplete="name"
            form={form}
            setForm={setForm}
            errors={errors}
            setErrors={setErrors}
          />
          <FormField
            id="email"
            label={t("email")}
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            form={form}
            setForm={setForm}
            errors={errors}
            setErrors={setErrors}
          />
          <div>
            <FormField
              id="password"
              label={t("password")}
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              form={form}
              setForm={setForm}
              errors={errors}
              setErrors={setErrors}
            />
            <PasswordStrengthIndicator password={form.password} />
          </div>
          <FormField
            id="confirmPassword"
            label={t("confirmPassword")}
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            form={form}
            setForm={setForm}
            errors={errors}
            setErrors={setErrors}
          />

          <div className="form-group">
            <label className="form-label">{t("licenseKey")} (Optional)</label>
            <input
              type="text"
              className={`form-input ${errors.licenseKey ? "error" : ""}`}
              placeholder="DUKA-XXXX-XXXX-XXXX"
              value={form.licenseKey || ""}
              onChange={(e) => {
                const newValue = e.target.value.toUpperCase();
                setForm((prev) => ({ ...prev, licenseKey: newValue }));
                // Clear error for this field when user starts typing
                if (errors.licenseKey) {
                  setErrors((prev) => ({ ...prev, licenseKey: "" }));
                }
              }}
            />
            {errors.licenseKey && (
              <span className="form-error">{errors.licenseKey}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <div
                  className="spinner"
                  style={{ width: 20, height: 20, borderWidth: 2 }}
                />
                &nbsp;Creating account...
              </>
            ) : (
              `✨ ${t("signUp")}`
            )}
          </button>
        </form>

        <div className={styles.authFooter}>
          <p>
            {t("haveAccount")}{" "}
            <Link to="/login" className={styles.authLink}>
              {t("signIn")}
            </Link>
          </p>
        </div>
      </div>

      <div className={styles.authDecor}>
        <div className={styles.decorCard}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
          <div className={styles.decorAmount} style={{ fontSize: 28 }}>
            Track. Grow.
          </div>
          <div className={styles.decorLabel}>Know your profits every day</div>
        </div>
        <div className={styles.decorBg}></div>
      </div>
    </div>
  );
}
