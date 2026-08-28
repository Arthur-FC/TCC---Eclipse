import { BadRequestException } from '@nestjs/common';

const SPOTIFY_TRACK_ID = /^[A-Za-z0-9]{22}$/;

export interface ParsedSpotifyTrackLink {
  trackId: string;
  canonicalUrl: string;
}

export function parseSpotifyTrackLink(value: string): ParsedSpotifyTrackLink {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw invalidSpotifyLink();
  }

  if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') {
    throw invalidSpotifyLink();
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments[0]?.startsWith('intl-')) segments.shift();
  if (
    segments.length !== 2 ||
    segments[0] !== 'track' ||
    !SPOTIFY_TRACK_ID.test(segments[1])
  ) {
    throw invalidSpotifyLink();
  }

  return {
    trackId: segments[1],
    canonicalUrl: `https://open.spotify.com/track/${segments[1]}`,
  };
}

function invalidSpotifyLink(): BadRequestException {
  return new BadRequestException(
    'Informe um link de faixa do Spotify no formato https://open.spotify.com/track/ID.',
  );
}
