import { DoorOpen, Coffee, VolumeX, Car } from "lucide-react";

const privileges = [
  {
    icon: DoorOpen,
    title: "Private Travertine Arrival",
    description:
      "Discreet subterranean entryway with dedicated changing sanctuaries and zero public crossovers.",
  },
  {
    icon: Coffee,
    title: "Bespoke Apothecary Tisane",
    description:
      "Custom-steeped herbal decoctions formulated to your biometric vitals upon your moment of arrival.",
  },
  {
    icon: VolumeX,
    title: "Acoustic Shielded Sanctums",
    description:
      "Engineered sound isolation maintaining an ambient baseline under 38dB for unbroken stillness.",
  },
  {
    icon: Car,
    title: "Valet & Private Butler",
    description:
      "Private vehicle transfer assistance paired with an attentive personal attendant for your stay.",
  },
];

export default function PrivilegesRibbon() {
  return (
    <div className="mb-20 bg-[#EFEEEA] p-10 shadow-sm">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-[#B08D57]">
          Uncompromising Seclusion
        </span>
        <h3 className="font-serif text-2xl text-[#171512]">
          The Aviana Sanctuary Experience Privileges
        </h3>
        <p className="mt-1 text-sm font-light text-[#928E88]">
          Included across every private ritual booking across our global houses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {privileges.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex flex-col items-center bg-white/80 p-6 text-center shadow-sm backdrop-blur transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#B08D57]/10 text-[#B08D57]">
              <Icon className="h-7 w-7" strokeWidth={1.6} />
            </div>
            <h4 className="mb-1 font-serif text-lg text-[#171512]">{title}</h4>
            <p className="text-sm font-light text-[#928E88]">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}