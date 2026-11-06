import Lotus from "../About/shared/Lotus";

export default function FormSuccess({ title, text, onReset }) {
  return (
    <div role="status" className="py-12 text-center">
      <div className="mb-8 flex justify-center">
        <Lotus className="h-8 w-10" />
      </div>
      <h3 className="font-serif text-3xl font-light uppercase tracking-[0.1em] text-[#171512]">
        {title}
      </h3>
      <p className="mx-auto mt-5 max-w-sm text-sm font-light leading-8 text-[#918b84]">
        {text}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-8 inline-flex min-h-11 items-center border-b border-[#b08d57] pb-1 text-[10px] font-medium uppercase tracking-[0.24em] text-[#8f7042] transition-colors hover:text-[#b08d57]"
      >
        Send another
      </button>
    </div>
  );
}
