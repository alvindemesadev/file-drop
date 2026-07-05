import Link from 'next/link';
import { Upload, ScanQrCode } from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

export default function Home() {
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">FileDrop</h1>
        <p className="text-muted-foreground mt-2">
          Share files instantly — no sign-up required
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <Link href="/upload">
          <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Upload className="size-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-base">I&apos;m a Sender</p>
                <p className="text-sm text-muted-foreground">
                  Upload files and get a shareable link
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/receive">
          <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ScanQrCode className="size-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-base">I&apos;m a Receiver</p>
                <p className="text-sm text-muted-foreground">
                  Enter a code or upload a QR to download files
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
