import { Link } from "@tanstack/react-router";

export default function Header() {
  return (
    <>
      <header className="p-2 flex items-center bg-gray-800 text-white shadow-lg">
        <h1 className="ml-4 text-xl font-semibold">
          <Link to="/">Scheduler</Link>
        </h1>
      </header>
    </>
  );
}
