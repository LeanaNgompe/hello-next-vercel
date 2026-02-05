// components/Sidebar.tsx
import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <Link href="/" className="text-2xl font-bold text-gray-800">
          Leana's Crak'd
        </Link>
      </div>
      <nav className="flex flex-col p-4 space-y-2">
        <Link href="/hello-world" className="px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100">
          Hello World
        </Link>
        <Link href="/captions" className="px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100">
          Captions List
        </Link>
      </nav>
    </aside>
  );
}
