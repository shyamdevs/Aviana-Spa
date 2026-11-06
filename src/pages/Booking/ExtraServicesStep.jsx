import MediaImage from '../../components/MediaImage';
import { money } from '../../utils/format';

export default function ExtraServicesStep({ items, selectedIds, toggle }) {
  return (
    <section className="space-y-7">
      <div>
        <p className="text-xs font-medium text-[#8d6a39]">Enhance your ritual (optional)</p>
        <h2 className="mt-2 font-serif text-2xl sm:text-3xl">Would you like any extra service?</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#7c725f]">Add one or more finishing touches. Your selections are priced at checkout and preserved with the booking.</p>
      </div>
      {!items.length ? (
        <div className="border border-[#e3ddd4] bg-white p-6 text-sm text-[#7c725f]">There are no extra services available at the moment.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {items.map((item) => {
            const active = selectedIds.includes(item._id);
            return (
              <button type="button" key={item._id} onClick={() => toggle(item._id)} aria-pressed={active} className={`group relative flex min-h-28 overflow-hidden border text-left transition sm:block sm:min-h-0 ${active ? 'border-[#8d6a39] bg-[#f1e4cf] ring-1 ring-[#b08d57]/25' : 'border-[#e3ddd4] bg-white hover:border-[#b08d57]/55'}`}>
                <div className="relative w-28 shrink-0 overflow-hidden sm:aspect-[5/3] sm:w-auto">
                  <div className="absolute inset-0 sm:relative sm:inset-auto sm:h-full sm:w-full">
                    <MediaImage src={item.image} name={item.name} alt={item.name} wrapperClassName="h-full w-full" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  </div>
                  {active && <span className="absolute right-3 top-3 hidden rounded-full bg-[#201e1a] px-3 py-1.5 text-[10px] tracking-[0.1em] text-white sm:block">Selected</span>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between p-4 sm:block sm:p-5">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg leading-snug text-[#201e1a] sm:text-xl">{item.name}</h3>
                      <p className="mt-1 text-xs leading-5 text-[#7c725f] sm:mt-2">{item.description || 'A considered addition to your Aviana ritual.'}</p>
                    </div>
                    <span className="shrink-0 font-serif text-base sm:text-lg">{money(item.price)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#7a6240] sm:mt-4">
                    <span aria-hidden="true" className={`grid h-5 w-5 place-items-center rounded-full border text-xs ${active ? 'border-[#201e1a] bg-[#201e1a] text-white' : 'border-[#d8d0c3] text-transparent'}`}>✓</span>
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
