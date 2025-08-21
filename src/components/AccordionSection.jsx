import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function AccordionSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#ffffff05] rounded-lg bg-black/02 w-full">
      <button
        className="w-full flex justify-between items-center px-4 py-3 text-left text-white/90 font-semibold text-lg lg:text-lg focus:outline-none cursor-pointer"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="text-2xl">{title}</span>
        {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}
