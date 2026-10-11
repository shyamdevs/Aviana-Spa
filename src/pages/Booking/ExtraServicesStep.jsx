import MediaImage from '../../components/MediaImage';
import { money } from '../../utils/format';

export default function ExtraServicesStep({ items, selectedIds, toggle }) {
  return (
    <section className="space-y-7">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#b08d57]">Enhance your ritual</p>
        <h2 className="mt-2 font-serif text-3xl">Would you like any extra service?</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#7c725f]">Add one or more finishing touches. Your selections are priced at checkout and preserved with the booking.</p>
      </div>
      {!items.length ? (
        <div className="border border-[#e3ddd4] bg-white p-6 text-sm text-[#7c725f]">There are no extra services available at the moment.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const active = selectedIds.includes(item._id);
            return (
              <button type="button" key={item._id} onClick={() => toggle(item._id)} aria-pressed={active} className={`group overflow-hidden border text-left transition ${active ? 'border-[#8d6a39] bg-[#f1e4cf] ring-1 ring-[#b08d57]/25' : 'border-[#e3ddd4] bg-white hover:border-[#b08d57]/55'}`}>
                <div className="relative aspect-[5/3] overflow-hidden">
                  <MediaImage src={item.image} name={item.name} alt={item.name} wrapperClassName="h-full w-full" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  {active && <span className="absolute right-3 top-3 rounded-full bg-[#201e1a] px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-white">Selected</span>}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-xl text-[#201e1a]">{item.name}</h3>
                      <p className="mt-2 text-xs leading-5 text-[#7c725f]">{item.description || 'A considered addition to your Aviana ritual.'}</p>
                    </div>
                    <span className="shrink-0 font-serif text-lg">{money(item.price)}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[#8f7042]">
                    <span className={`grid h-5 w-5 place-items-center rounded-full border text-xs ${active ? 'border-[#201e1a] bg-[#201e1a] text-white' : 'border-[#d8d0c3] text-transparent'}`}>✓</span>
                    {active ? 'Added to booking' : 'Add to booking'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
