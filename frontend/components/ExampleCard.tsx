import ImageWithFallback from './ImageWithFallback';
import { Thumb } from './ui';

// Card ilustrativo (valores de exemplo) usado no início e no login
const ITEMS = [
  { name: 'Shampoo', market: 'Empório Casa Nova', price: 'R$ 18,90',     image_url: '/images/products/shampoo-brilho-natural.png'},
  { name: 'Condicionador', market: 'Supermercado Pé de Milho', price: 'R$ 21,50', image_url: '/images/products/condicionador-brilho-natural.png'},
];

export default function ExampleCard({ title }: { title: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 text-ink shadow-xl">
      <p className="mb-4 text-xs font-medium text-muted">{title}</p>
      <ul className="space-y-3">
        {ITEMS.map((item) => (
          <li key={item.name} className="flex items-center gap-4">
            <ImageWithFallback
              src={item.image_url}
              alt={item.name}
              fallbackText={item.name}
              fit="contain"
              imgPadding="p-1"
              sizes="48px"
              className="h-12 w-12 shrink-0 rounded-xl"
            />
            <div className="flex-1">
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-muted">{item.market}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{item.price}</p>
              <span className="badge-gold">Mais barato</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between border-t border-line pt-4 font-semibold">
        <span>Você economiza</span>
        <span className="font-bold text-olive">R$ 7,30</span>
      </div>
    </div>
  );
}
