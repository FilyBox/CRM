import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { i18n, type MessageDescriptor } from '@lingui/core';

export const appMetaTags = (title?: MessageDescriptor) => {
  const description = 'Create, send, sign, and verify contracts securely with Plane Contracts.';

  return [
    {
      title: title ? `${i18n._(title)} - Plane Contracts` : 'Plane Contracts',
    },
    {
      name: 'description',
      content: description,
    },
    {
      name: 'keywords',
      content: 'Plane Contracts, document signing, electronic signatures, contract templates',
    },
    {
      name: 'author',
      content: 'Plane Contracts',
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
    {
      property: 'og:title',
      content: 'Plane Contracts',
    },
    {
      property: 'og:description',
      content: description,
    },
    {
      property: 'og:image',
      content: `${NEXT_PUBLIC_WEBAPP_URL()}/opengraph-image.jpg`,
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:description',
      content: description,
    },
    {
      name: 'twitter:image',
      content: `${NEXT_PUBLIC_WEBAPP_URL()}/opengraph-image.jpg`,
    },
  ];
};
