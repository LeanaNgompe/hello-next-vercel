import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/captions');
  return null;
}
