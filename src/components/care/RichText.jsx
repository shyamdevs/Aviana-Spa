import { Link } from 'react-router-dom';
import { parseRichText } from './richText';

function Inline({ parts, onNavigate }) {
  return parts.map((part, index) => (part.type === 'link' ? (
    <Link
      key={index}
      to={part.to}
      onClick={onNavigate}
      className="font-semibold text-[#7d5f2e] underline underline-offset-2 hover:text-[#5e4620] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7d5f2e]"
    >
      {part.label}
    </Link>
  ) : (
    <span key={index}>{part.value}</span>
  )));
}

/* Renders an assistant reply as paragraphs, lists and internal links - never as HTML. */
export default function RichText({ text, onNavigate }) {
  const blocks = parseRichText(text);
  return (
    <div className="space-y-2 break-words text-[14px] leading-relaxed">
      {blocks.map((block, index) => (block.type === 'ul' ? (
        <ul key={index} className="list-disc space-y-1 pl-5 marker:text-[#7d5f2e]">
          {block.items.map((item, i) => <li key={i}><Inline parts={item} onNavigate={onNavigate} /></li>)}
        </ul>
      ) : (
        <p key={index}><Inline parts={block.parts} onNavigate={onNavigate} /></p>
      )))}
    </div>
  );
}
