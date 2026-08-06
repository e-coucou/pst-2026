import ShareCardButton from '@/components/ShareCardButton';

export default function ShareMatchButton({ gameId, className }: { gameId: number; className?: string }) {
  return (
    <ShareCardButton
      imageUrl={`/api/card/match/${gameId}`}
      fileName={`pst-match-${gameId}.png`}
      className={className}
    />
  );
}
