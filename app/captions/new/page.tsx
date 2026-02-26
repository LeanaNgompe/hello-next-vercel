import CaptionGenerator from '@/components/pipeline/CaptionGenerator';
import { FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';

export const metadata = {
  title: 'Generate Captions | Crackd',
  description: 'Upload an image and let AI generate the perfect caption for you.',
};

export default function NewCaptionPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-10 space-y-4">
          <Link 
            href="/captions" 
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <FiArrowLeft /> Back to Gallery
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Create New Caption
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Upload your image and our pipeline will handle the rest.
            </p>
          </div>
        </header>

        <section className="mt-8">
          <CaptionGenerator />
        </section>

        <footer className="mt-20 text-center text-sm text-gray-400 font-medium">
          Powered by AlmostCrackd AI Pipeline
        </footer>
      </div>
    </main>
  );
}
