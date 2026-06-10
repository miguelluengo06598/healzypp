"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type User = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    phone?: string;
    address?: string;
  };
} | null;

export default function ProfilePage() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        setName(u.user_metadata?.full_name || "");
        setEmail(u.email || "");
        setPhone(u.user_metadata?.phone || "");
        setAddress(u.user_metadata?.address || "");
      }
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: name,
        phone,
        address,
      },
    });

    setSaving(false);
    if (!error) setSaved(true);
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">Mis datos</h2>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo
          </label>
          <input
            type="text"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            className={`${inputClass} bg-gray-100 text-gray-500`}
            value={email}
            disabled
          />
          <p className="text-xs text-gray-400 mt-1">
            El email no se puede modificar desde aquí.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            type="tel"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+34 600 000 000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dirección
          </label>
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Calle, número, piso, ciudad, CP..."
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" className="rounded-xl h-10" disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Guardar cambios"
            )}
          </Button>
          {saved && (
            <span className="text-sm text-green-600">Guardado correctamente</span>
          )}
        </div>
      </form>
    </div>
  );
}
