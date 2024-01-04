import { useState } from "react";
import { Dialog, DialogTrigger,  DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { Expand, Loader2 } from "lucide-react";
import SimpleBar from "simplebar-react";
import { useToast } from './ui/use-toast';
import { Document, Page, } from 'react-pdf';
import { useResizeDetector } from "react-resize-detector";

interface PdfFullscreenProps {
    fileUrl: string;
}

export default function PdfFullscreen({ fileUrl }: PdfFullscreenProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [numPages, setNumbPages] = useState<number>();
    const { width, ref } = useResizeDetector();

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(v) => {
                if (!v) {
                    setIsOpen(v)
                }
            }}
        >
            <DialogTrigger 
                onClick={() => {setIsOpen(true)}}
                asChild
            >
                <Button
                    
                    variant='ghost'
                    className="gap-1.5"
                    aria-label="fullscreen"
                >
                    <Expand className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent
                className="max-w-7xl w-full"
            >
                <SimpleBar
                    autoHide={false}
                    className="max-h-[calc(100vh-10rem)] mt-6"
                >
                    <div
                        // useResizeDetector()
                        ref={ref}
                    >
                        <Document
                            loading={
                                <div
                                    className='flex justify-center'
                                >
                                    <Loader2 className='my-24 h-6 w-6 animate-spin' />
                                </div>
                            }
                            onLoadError={() => {
                                toast({
                                    title: 'Error laoding PDF',
                                    description: 'Please try again later',
                                    variant: 'destructive'
                                })
                            }}
                            onLoadSuccess={({ numPages }) => setNumbPages(numPages)}
                            file={fileUrl}
                            className='max-h-full'
                        >
                            {/* // very VV IMP: map over every page to show all of them */}
                            {new Array(numPages).fill(0).map((_, i) => (
                                <Page
                                    width={width ? width : 1}
                                    key={i}
                                    pageNumber={i+1}
                                />
                            ))}

                        </Document>
                    </div>

                </SimpleBar>
            </DialogContent>

        </Dialog>
    )
}
