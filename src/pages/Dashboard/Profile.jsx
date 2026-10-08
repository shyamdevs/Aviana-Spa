import { useEffect, useState } from "react";
import PortalShell from "../../components/PortalShell";
import Field from "../../components/Field";
import MediaImage from "../../components/MediaImage";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";

export default function Profile() {
  const { refresh } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
    gender: "prefer_not_to_say",
    dob: "",
    profileImage: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // =========================================
  // LOAD PROFILE
  // =========================================
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setError("");

        const response = await api.get("/profile");

        if (response?.user) {
          setForm((prev) => ({
            ...prev,
            ...response.user,
            dob: response.user.dob
              ? response.user.dob.slice(0, 10)
              : "",
            profileImage: response.user.profileImage || "",
          }));
        }
      } catch (err) {
        setError(err.message || "Unable to load profile.");
      }
    };

    loadProfile();
  }, []);

  // =========================================
  // CLEAN PREVIEW URL
  // =========================================
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // =========================================
  // FORM CHANGE
  // =========================================
  const change = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // =========================================
  // SAVE PROFILE
  // =========================================
  const save = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setSaving(true);

    try {
      await api.patch("/profile", form);

      await refresh();

      setMessage("Profile saved successfully.");
    } catch (err) {
      setError(err.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  // =========================================
  // IMAGE SELECT
  // =========================================
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setMessage("");
    setError("");

    // Allowed image types
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG or WEBP image.");
      return;
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    // Clear previous preview
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    // Save selected file
    setImage(file);

    // Create instant preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
  };

  // =========================================
  // UPLOAD IMAGE
  // =========================================
  const upload = async () => {
    if (!image) {
      setError("Please choose an image first.");
      return;
    }

    setMessage("");
    setError("");
    setUploading(true);

    try {
      const body = new FormData();

      body.append("image", image);

      const response = await api.post(
        "/profile/image",
        body
      );

      // Get uploaded image URL/path
      const uploadedImage =
        response?.profileImage ||
        response?.user?.profileImage ||
        "";

      if (!uploadedImage) {
        throw new Error(
          "Image uploaded, but image URL was not returned by the server."
        );
      }

      // Update local profile state
      setForm((prev) => ({
        ...prev,
        profileImage: uploadedImage,
      }));

      // Refresh auth/user context
      await refresh();

      // Clear temporary preview
      if (preview) {
        URL.revokeObjectURL(preview);
      }

      setPreview("");
      setImage(null);

      setMessage("Profile image updated successfully.");
    } catch (err) {
      setError(err.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // =========================================
  // CHANGE PASSWORD
  // =========================================
  const changePassword = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setChangingPassword(true);

    try {
      await api.post(
        "/profile/change-password",
        passwords
      );

      setMessage(
        "Password changed. Please sign in again."
      );

      setPasswords({
        currentPassword: "",
        newPassword: "",
      });
    } catch (err) {
      setError(
        err.message || "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // =========================================
  // CURRENT IMAGE
  // =========================================
  const hasPreview = Boolean(preview);
  const hasProfileImage = Boolean(form.profileImage);

  return (
    <PortalShell title="Your profile">
      <div className="grid gap-8 lg:grid-cols-2">

        {/* =====================================
            PERSONAL DETAILS
        ===================================== */}
        <form
          onSubmit={save}
          className="space-y-7 border border-black/5 bg-white p-7"
        >
          <h2 className="font-serif text-2xl">
            Personal details
          </h2>

          {/* Full name */}
          <Field
            label="Full name"
            name="fullName"
            value={form.fullName}
            onChange={change}
            required
          />

          {/* Phone */}
          <Field
            label="Phone"
            name="phone"
            value={form.phone || ""}
            onChange={change}
          />

          {/* Address */}
          <Field
            label="Address"
            name="address"
            value={form.address || ""}
            onChange={change}
          />

          {/* City + Pincode */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label="City"
              name="city"
              value={form.city || ""}
              onChange={change}
            />

            <Field
              label="Pincode"
              name="pincode"
              value={form.pincode || ""}
              onChange={change}
            />
          </div>

          {/* DOB */}
          <Field
            label="Date of birth"
            type="date"
            name="dob"
            value={form.dob || ""}
            onChange={change}
          />

          {/* Gender */}
          <label className="block space-y-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#7c725f]">
              Gender
            </span>

            <select
              name="gender"
              value={
                form.gender || "prefer_not_to_say"
              }
              onChange={change}
              className="w-full border-b border-[#d7d0c5] bg-transparent px-0 py-3 text-sm outline-none"
            >
              <option value="prefer_not_to_say">
                Prefer not to say
              </option>

              <option value="male">
                Male
              </option>

              <option value="female">
                Female
              </option>

              <option value="other">
                Other
              </option>
            </select>
          </label>

          {/* =====================================
              PROFILE IMAGE
          ===================================== */}
          <div className="space-y-4">
            <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-[#7c725f]">
              Profile image
            </span>

            <div className="flex items-center gap-5">

              {/* CLICKABLE IMAGE */}
              <label
                htmlFor="profile-image-upload"
                className="group relative h-24 w-20 shrink-0 cursor-pointer overflow-hidden rounded-sm"
                title="Click to change profile image"
              >
                {hasPreview ? (
                  <img
                    src={preview}
                    alt="Selected profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <MediaImage
                    src={hasProfileImage ? form.profileImage : ""}
                    name={form.fullName}
                    alt="Your profile image"
                    wrapperClassName="h-full w-full"
                    className="h-full w-full object-cover"
                  />
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/45 group-hover:opacity-100">
                  <span className="text-[9px] font-medium tracking-[0.12em] text-white">
                    CHANGE
                  </span>
                </div>
              </label>

              {/* Image information */}
              <div className="min-w-0">
                <p className="text-xs leading-5 text-[#9b9184]">
                  JPG, PNG or WEBP · max 5MB
                </p>

                {image && (
                  <p className="mt-1 truncate text-xs text-[#8e6f46]">
                    Selected: {image.name}
                  </p>
                )}
              </div>
            </div>

            {/* =====================================
                HIDDEN FILE INPUT
            ===================================== */}
            <input
              id="profile-image-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />

            {/* =====================================
                UPLOAD BUTTON
            ===================================== */}
            <button
              type="button"
              onClick={upload}
              disabled={!image || uploading}
              className="border border-[#d8d0c3] px-5 py-3 text-[10px] tracking-[0.16em] transition hover:bg-[#f8f5ef] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading
                ? "UPLOADING..."
                : image
                ? "UPLOAD IMAGE"
                : "CHOOSE IMAGE FIRST"}
            </button>
          </div>

          {/* =====================================
              SUCCESS / ERROR
          ===================================== */}
          {message && (
            <p className="text-sm text-green-700">
              {message}
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          {/* =====================================
              SAVE PROFILE
          ===================================== */}
          <button
            type="submit"
            disabled={saving}
            className="bg-[#201e1a] px-6 py-4 text-[10px] tracking-[0.2em] text-white transition hover:bg-[#342f28] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "SAVING..."
              : "SAVE PROFILE"}
          </button>
        </form>

        {/* =====================================
            CHANGE PASSWORD
        ===================================== */}
        <form
          onSubmit={changePassword}
          className="space-y-7 border border-black/5 bg-white p-7"
        >
          <h2 className="font-serif text-2xl">
            Change password
          </h2>

          <Field
            label="Current password"
            type="password"
            value={passwords.currentPassword}
            onChange={(e) =>
              setPasswords((prev) => ({
                ...prev,
                currentPassword:
                  e.target.value,
              }))
            }
            required
          />

          <Field
            label="New password"
            type="password"
            minLength={8}
            value={passwords.newPassword}
            onChange={(e) =>
              setPasswords((prev) => ({
                ...prev,
                newPassword:
                  e.target.value,
              }))
            }
            required
          />

          <button
            type="submit"
            disabled={changingPassword}
            className="bg-[#201e1a] px-6 py-4 text-[10px] tracking-[0.2em] text-white transition hover:bg-[#342f28] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {changingPassword
              ? "UPDATING..."
              : "UPDATE PASSWORD"}
          </button>
        </form>
      </div>
    </PortalShell>
  );
}