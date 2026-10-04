import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/site/common";
import { useAuth } from "@/lib/auth";
import { CITIES, TOOL_CATEGORIES } from "@/lib/constants";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/list-tool")({
  head: () => seo("List equipment", "Rent out or sell tools and equipment."),
  component: ListTool,
});

const schema = z.object({
  title: z.string().trim().min(4, "Add a title").max(120),
  category: z.string().min(1, "Choose a category"),
  city: z.string().min(1, "Choose a city"),
  listing_type: z.enum(["rent", "sell"]),
  price: z.coerce.number().int().positive("Enter a price"),
  price_unit: z.enum(["day", "week", "once"]),
  deposit: z.coerce.number().int().min(0),
  condition: z.enum(["like_new", "good", "fair"]),
  description: z.string().trim().min(20, "At least 20 characters").max(3000),
});
type F = z.infer<typeof schema>;

function ListTool() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema) as never,
    defaultValues: { listing_type: "rent", price_unit: "day", deposit: 0, condition: "good", city: profile?.city ?? "" },
  });
  async function onSubmit(v: F) {
    const { data, error } = await supabase.from("tool_listings").insert({ ...v, price_unit: v.listing_type === "sell" ? "once" : v.price_unit, owner_id: profile!.id }).select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success("Listing published");
    navigate({ to: "/marketplace/$id", params: { id: data.id } });
  }
  const Err = ({ k }: { k: keyof F }) => errors[k] ? <p className="mt-1 text-xs text-destructive">{String(errors[k]?.message)}</p> : null;
  const sel = "mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm";
  const rent = watch("listing_type") === "rent";
  if (!profile) return null;
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader title="List equipment" subtitle="Earn from tools you aren't using every day." />
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
        <div><Label htmlFor="title">Title</Label><Input id="title" placeholder="e.g. Bosch rotary hammer with bits" {...register("title")} className="mt-1" /><Err k="title" /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><Label htmlFor="listing_type">Listing</Label><select id="listing_type" {...register("listing_type")} className={sel}><option value="rent">For rent</option><option value="sell">For sale</option></select></div>
          <div><Label htmlFor="category">Category</Label><select id="category" {...register("category")} className={sel}><option value="">Select</option>{TOOL_CATEGORIES.map((t) => <option key={t}>{t}</option>)}</select><Err k="category" /></div>
          <div><Label htmlFor="city">City</Label><select id="city" {...register("city")} className={sel}><option value="">Select</option>{CITIES.map((t) => <option key={t}>{t}</option>)}</select><Err k="city" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div><Label htmlFor="price">Price (₹)</Label><Input id="price" type="number" {...register("price")} className="mt-1" /><Err k="price" /></div>
          {rent && <div><Label htmlFor="price_unit">Per</Label><select id="price_unit" {...register("price_unit")} className={sel}><option value="day">Day</option><option value="week">Week</option></select></div>}
          {rent && <div><Label htmlFor="deposit">Deposit (₹)</Label><Input id="deposit" type="number" {...register("deposit")} className="mt-1" /></div>}
          <div><Label htmlFor="condition">Condition</Label><select id="condition" {...register("condition")} className={sel}><option value="like_new">Like new</option><option value="good">Good</option><option value="fair">Fair</option></select></div>
        </div>
        <div><Label htmlFor="description">Description</Label><Textarea id="description" rows={6} placeholder="What's included, pickup details, usage notes…" {...register("description")} className="mt-1" /><Err k="description" /></div>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Publishing…" : "Publish listing"}</Button>
      </form>
    </div>
  );
}
