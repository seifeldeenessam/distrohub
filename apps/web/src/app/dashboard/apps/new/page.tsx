import { createApp } from "../../actions";
import { AppForm } from "../../app-form";

export const metadata = { title: "New product" };

export default function NewAppPage() {
  return (
    <>
      <h1 className="mb-8 text-3xl font-bold">New product</h1>
      <AppForm action={createApp} submitLabel="Create product" />
    </>
  );
}
