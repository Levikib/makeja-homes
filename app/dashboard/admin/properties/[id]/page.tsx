import PropertyDetailsClient from "./PropertyDetailsClient";

export default function PropertyDetailsPage({ params }: { params: { id: string } }) {
  return <PropertyDetailsClient propertyId={params.id} />;
}
