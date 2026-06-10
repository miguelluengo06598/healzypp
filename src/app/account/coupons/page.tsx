import { Metadata } from "next";
import { Ticket } from "lucide-react";

export const metadata: Metadata = {
  title: "Mis cupones | HEALZYP",
};

export default function CouponsPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Mis cupones</h2>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Ticket className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-gray-900 font-medium">No tienes cupones activos</p>
        <p className="text-sm text-gray-500 mt-1">
          Mantente atento a nuestras promociones.
        </p>
      </div>
    </div>
  );
}
