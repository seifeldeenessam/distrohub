import { createApp } from "../../actions";
import { AppForm } from "../../app-form";

export const metadata = { title: "New app" };

export default function NewAppPage() {
  return (
    <>
      <h1 className="mb-8 text-3xl font-bold">New app</h1>
      <AppForm action={createApp} submitLabel="Create app" />
    </>
  );
}
