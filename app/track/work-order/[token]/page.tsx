import { PublicWorkOrderView } from './public-work-order-view'

export default function TrackWorkOrderPage({ params }: { params: { token: string } }) {
  return <PublicWorkOrderView token={params.token} />
}