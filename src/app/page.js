import { redirect } from 'next/navigation';

// The Employee Portal (/employee) is the landing page for the app — it
// already covers both "check my hours" and "staff login" in one place, so
// this route just forwards there instead of duplicating that content.
export default function Home() {
  redirect('/employee');
}
