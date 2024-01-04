// Worker need client side to worker
"use client"

import { ChevronDown, ChevronUp, Loader2, RotateCw, Search } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useToast } from './ui/use-toast';
import Simplebar from 'simplebar-react';
import { useResizeDetector } from 'react-resize-detector';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import PdfFullscreen from './PdfFullscreen';

// VVV imp: WORKER
// very very VV imp: we WORKER to handle the pdf type, we cant treat it like image, pdf type can't be handled by default 
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`

interface PdfRedererProps {
    url: string;
}



const PdfRenderer = ({ url }: PdfRedererProps) => {
    const { toast } = useToast();

    // very light weight. But life changing . we can get width of div and resize the pdf for div
    const { width, ref } = useResizeDetector();

    const [numPages, setNumbPages] = useState<number>();
    const [currPage, setCurrPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1);
    const [rotation, setRotation] = useState<number>(0);

    // trick: for removing the blank while zooming. How:We hold on to original scale until new scale is properly rendered 
    const [renderedScale, setRenderedScale] = useState<number | null>(null);
    // if renderedScale !== scale then we are in process of rendering a new page
    const isLoading = renderedScale !== scale;

    // schema validation with library zod
    const CutomPageValidator = z.object({
        page: z.string().refine((num) => Number(num) > 0 && Number(num) <= numPages!)
    });
    // turning z into type so we can use it as typescript type
    type TCutomPageValidator = z.infer<typeof CutomPageValidator>

    // linking customPageValidator and form using @hookform/resolvers package
    // we can get logic from typescript type so we need @hookform/resolvers
    // register take care of onValue, onChange, input etc
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm<TCutomPageValidator>({
        defaultValues: {
            page: "1"

        },
        // zod resolver from hookform/resolvers
        resolver: zodResolver(CutomPageValidator)
    });

    const handlePageSubmit = ({
        page,
    }: TCutomPageValidator) => {
        setCurrPage(Number(page));
        setValue("page", String(page))
    }

    return (
        <div
            className="w-full bg-white rounded-md shadow flex flex-col items-center"
        >
            {/*topBar  */}
            <div
                className="h-14 w-full border-b border-zinc-200 flex items-center justify-between px-2"
            >
                <div
                    className="flex items-center gap-1.5"
                >
                    <Button
                        disabled={currPage <= 1}
                        onClick={() => {
                            setCurrPage((prev) => (prev - 1 > 1 ? prev - 1 : 1));
                            setValue("page", String(currPage - 1))
                        }
                        }
                        variant='ghost'>
                        <ChevronDown className='h-4 w-4' />

                    </Button>
                    <div
                        className='flex items-center gap-1.5'
                    >
                        <Input
                            {...register("page")}
                            className={
                                cn('w-12 h-8',
                                    errors.page && "focus-visible:ring-red-500")
                            }
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSubmit(handlePageSubmit)()
                                }
                            }}

                        />
                        <p className="text-zinc-700 text-sm space-x-1">
                            <span>/</span>
                            <span>{numPages ?? "x"}</span>
                        </p>
                    </div>
                    <Button
                        disabled={numPages === undefined || currPage === numPages}
                        onClick={() => {
                            setCurrPage((prev) => (prev + 1 > numPages! ? numPages! : prev + 1))
                            setValue("page", String(currPage + 1))
                        }}
                        variant='ghost' >
                        <ChevronUp className='h-4 w-4' />

                    </Button>
                </div>
                {/* zomming */}
                <div
                    className='space-x-2'
                >
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                className="gap-1.5" aria-label='zoom'
                                variant='ghost'
                            >
                                <Search className="h-4 w-4" />
                                {scale * 100}%<ChevronDown className='h-3 w-3 opacity-50' />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => setScale(1)}>
                                100%
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setScale(1.5)}>
                                150%
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setScale(2)}>
                                200%
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setScale(2.5)}>
                                250%
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* rotate button */}
                    <Button
                        aria-label='rotate 90 degree'
                        variant='ghost'
                        onClick={() =>
                            setRotation((prev) => prev + 90)
                        }
                    >
                        <RotateCw className='h-4 w-4' />
                    </Button>
                    <PdfFullscreen
                        fileUrl={url}
                    />
                </div>

            </div>

            <div
                className="flex-1 w-full max-h-screen"
            >
                <Simplebar
                    autoHide={false}
                    className='max-h-[calc(100vh-10rem)]'
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
                            file={url}
                            className='max-h-full'
                        >
                            {isLoading && renderedScale ?
                                // if rendered scaled or zoom page is ready
                                (<Page
                                    width={width ? width : 1}
                                    pageNumber={currPage}
                                    // zoom
                                    scale={scale}
                                    rotate={rotation}
                                    key={"@" + renderedScale}

                                />) :
                                // if rendered scaled or zoom page isnot ready
                                (<Page
                                    className={cn(isLoading ? "hidden": "")}
                                    width={width ? width : 1}
                                    pageNumber={currPage}
                                    // key is imp so no flickering on resizing
                                    key={"@" + scale}
                                    // zoom
                                    scale={scale}
                                    rotate={rotation}
                                    loading={
                                        <div
                                            className='flex justify-center'
                                        >
                                            <Loader2 className='my-24 h-6 w-6 animate-spin' />
                                        </div>
                                    }
                                    // update the page if rendered is ready and success
                                    onRenderSuccess={ () => setRenderedScale(scale)}

                                />)
                            }
                        </Document>
                    </div>
                </Simplebar>
            </div>
        </div>

    )
}

export default PdfRenderer