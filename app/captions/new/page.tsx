import CaptionGenerator from '@/components/pipeline/CaptionGenerator';
import { FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';

export const metadata = {
  title: 'Pipeline | Crackd',
  description: 'AI-assisted caption generation and curation.',
};

export default function NewCaptionPage() {
  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-6 pt-20">
        <header className="mb-16">
          <Link 
            href="/captions" 
            className="inline-flex items-center gap-2 text-[10px] font-black text-[#8C8C8C] uppercase tracking-widest hover:text-[#2B2B2B] transition-colors mb-8"
          >
            <FiArrowLeft /> Return to Gallery
          </Link>
        </header>

        <section>
          <CaptionGenerator />
        </section>

        <footer className="mt-32 text-center">
          <div className="h-[1px] w-20 bg-[#2B2B2B] mx-auto mb-6"></div>
          <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-[0.3em]">
            Crackd Editorial Pipeline / v1.0
          </p>
        </footer>
      </div>
    </main>
  );
}
