import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface BookCoverProps {
  src: string;
  title: string;
  author: string;
  category: string;
  className?: string;
}

export function BookCover({ src, title, author, category, className = '' }: BookCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-teal-950 p-4 text-white ${className}`}
      >
        <div className="flex items-center justify-between text-xs text-teal-200/80">
          <span className="truncate font-mono">{category}</span>
          <BookOpen className="h-4 w-4 shrink-0" />
        </div>
        <div className="space-y-1.5">
          <p className="font-display text-sm font-semibold leading-snug text-white line-clamp-3">
            {title}
          </p>
          <p className="text-xs text-slate-300 truncate">{author}</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Sampul buku ${title} oleh ${author}`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
