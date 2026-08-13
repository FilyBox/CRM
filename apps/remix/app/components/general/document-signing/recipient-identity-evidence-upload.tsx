import {
  RECIPIENT_IDENTITY_ACCEPTED_MIME_TYPES,
  RECIPIENT_IDENTITY_MAX_FILE_SIZE,
  RECIPIENT_IDENTITY_MAX_FILES,
  RECIPIENT_IDENTITY_MIN_FILES,
} from '@documenso/lib/constants/recipient-identity';
import { Button } from '@documenso/ui/primitives/button';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { Trans, useLingui } from '@lingui/react/macro';
import { BadgeCheckIcon, ImagePlusIcon, ShieldCheckIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type RecipientIdentityEvidenceUploadProps = {
  token: string;
  disabled?: boolean;
  onStatusChange: (count: number, isLoading: boolean) => void;
};

type IdentityEvidenceResponse = {
  evidence: Array<{ id?: string; fileName: string; position: number; sha256: string }>;
  minimum?: number;
  maximum?: number;
};

export const RecipientIdentityEvidenceUpload = ({
  token,
  disabled = false,
  onStatusChange,
}: RecipientIdentityEvidenceUploadProps) => {
  const { t } = useLingui();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [evidence, setEvidence] = useState<IdentityEvidenceResponse['evidence']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingEvidenceId, setDeletingEvidenceId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void fetch(`/api/files/recipient-identity/${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Unable to load identification evidence');
        }

        return (await response.json()) as IdentityEvidenceResponse;
      })
      .then((result) => {
        if (isMounted) {
          setEvidence(result.evidence);
        }
      })
      .catch(() => {
        if (isMounted) {
          toast({
            title: t`Unable to load identification images`,
            description: t`Please refresh the page and try again.`,
            variant: 'destructive',
          });
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, toast, t]);

  useEffect(() => {
    onStatusChange(evidence.length, isLoading || isUploading || deletingEvidenceId !== null);
  }, [deletingEvidenceId, evidence.length, isLoading, isUploading, onStatusChange]);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    if (evidence.length + files.length > RECIPIENT_IDENTITY_MAX_FILES) {
      toast({
        title: t`You can upload up to four images`,
        description: t`Remove an existing image before adding another one.`,
        variant: 'destructive',
      });
      return;
    }

    const hasInvalidFile = files.some(
      (file) =>
        !RECIPIENT_IDENTITY_ACCEPTED_MIME_TYPES.includes(
          file.type as (typeof RECIPIENT_IDENTITY_ACCEPTED_MIME_TYPES)[number],
        ) || file.size > RECIPIENT_IDENTITY_MAX_FILE_SIZE,
    );

    if (hasInvalidFile) {
      toast({
        title: t`Invalid identification image`,
        description: t`Use JPEG or PNG images no larger than 10 MB each.`,
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    setIsUploading(true);

    try {
      const response = await fetch(`/api/files/recipient-identity/${encodeURIComponent(token)}`, {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as IdentityEvidenceResponse & { error?: string };

      if (!response.ok) {
        throw new Error(result.error || 'Unable to upload identification images');
      }

      setEvidence(result.evidence);
      toast({
        title: t`Identification images saved`,
        description:
          result.evidence.length >= RECIPIENT_IDENTITY_MIN_FILES
            ? t`The minimum requirement is complete.`
            : t`Add one more image to enable signing.`,
      });
    } catch (error) {
      toast({
        title: t`Unable to save identification images`,
        description: error instanceof Error ? error.message : t`Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveEvidence = async (evidenceId: string) => {
    setDeletingEvidenceId(evidenceId);

    try {
      const response = await fetch(
        `/api/files/recipient-identity/${encodeURIComponent(token)}/${encodeURIComponent(evidenceId)}`,
        { method: 'DELETE' },
      );
      const result = (await response.json()) as IdentityEvidenceResponse & { error?: string };

      if (!response.ok) {
        throw new Error(result.error || 'Unable to remove identification image');
      }

      setEvidence(result.evidence);
      toast({
        title: t`Identification image removed`,
      });
    } catch (error) {
      toast({
        title: t`Unable to remove identification image`,
        description: error instanceof Error ? error.message : t`Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setDeletingEvidenceId(null);
    }
  };

  const isComplete = evidence.length >= RECIPIENT_IDENTITY_MIN_FILES;

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <ShieldCheckIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">
            <Trans>Official identification required</Trans>
          </p>
          <p className="mt-1 text-muted-foreground text-sm">
            <Trans>
              Upload at least two clear photos of the same official identification, including the side where your
              signature appears. One evidence page bearing your name and email will be added to the completed contract.
            </Trans>
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            <Trans>You can add the photos one at a time or select several at once.</Trans>
          </p>
        </div>
      </div>

      {evidence.length > 0 && (
        <div className="mt-3 space-y-2">
          {evidence.map((item, index) => (
            <div
              key={item.id || item.sha256}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {item.id ? (
                <img
                  src={`/api/files/recipient-identity/${encodeURIComponent(token)}/${encodeURIComponent(item.id)}`}
                  alt={item.fileName}
                  className="h-12 w-12 shrink-0 rounded border border-border object-cover"
                />
              ) : (
                <BadgeCheckIcon className="h-4 w-4 shrink-0 text-green-600" />
              )}
              <span className="min-w-0 flex-1 truncate">{item.fileName}</span>
              <span className="shrink-0 text-muted-foreground">
                <Trans>Image {index + 1}</Trans>
              </span>
              {item.id && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 px-0"
                  loading={deletingEvidenceId === item.id}
                  disabled={disabled || isUploading || deletingEvidenceId !== null}
                  aria-label={t`Remove identification image`}
                  onClick={() => item.id && void handleRemoveEvidence(item.id)}
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={RECIPIENT_IDENTITY_ACCEPTED_MIME_TYPES.join(',')}
        multiple
        disabled={disabled || isLoading || isUploading}
        onChange={(event) => void handleFilesSelected(Array.from(event.target.files || []))}
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className={isComplete ? 'text-green-700 text-xs' : 'text-muted-foreground text-xs'}>
          {isComplete ? (
            <Trans>{evidence.length} identification images ready</Trans>
          ) : (
            <Trans>{evidence.length} of 2 required images added</Trans>
          )}
        </p>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={isLoading || isUploading}
          disabled={disabled || isLoading || isUploading || evidence.length >= RECIPIENT_IDENTITY_MAX_FILES}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlusIcon className="mr-2 h-4 w-4" />
          {evidence.length > 0 ? <Trans>Add another image</Trans> : <Trans>Add identification image</Trans>}
        </Button>
      </div>
    </div>
  );
};
