// UPload button
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import Dropzone from 'react-dropzone';
import { Cloud, File, Loader } from 'lucide-react';
import { Progress } from './ui/progress';
import { useUploadThing } from '@/lib/uploadthing';
import { useToast } from './ui/use-toast';
import { trpc } from '@/app/_trpc/client';
import { useRouter } from 'next/navigation';


const UploadDropzone = () => {

  const [isUploading, setIsUploading] = useState< boolean|null > (false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const {startUpload} = useUploadThing("pdfUploader");
  const {toast} = useToast();
  const router = useRouter();

  // VV imP: 4:30 of video : POLLING, right away there will be no file  but after some sec there will be file , so we poll until we get the file
  // we applied startPolling below in bottom of dropzone action
  const {mutate: startPolling} = trpc.getFile.useMutation({
    onSuccess: (file) => {
      // if file fond or database synced with uploadthing
      router.push(`/dashboard/${file.id}`)
    },
    // VVV IMP: POLLING. below is main Polling concept
    retry: true,
    retryDelay: 500,
  })

  // determinate progress : if we dont have access of actual progress
  const startSimulatedProgress = () => {
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prevProgress) => {
        if(prevProgress >= 95) {
          clearInterval(interval)
          return prevProgress
        }
        return prevProgress + 5;
      })
    }, 500)
    return interval;
  };
  
  return (
    <Dropzone
      multiple={false}
      onDrop={async(acceptedFile) => {
 
        setIsUploading(true);

        const progressInterval = startSimulatedProgress();

        // handle upload to uploadthing
        const res = await startUpload(acceptedFile);

        if (!res) {
            return toast({
              title: 'Something went Wrong',
              description: "Please try again later",
              variant: 'destructive'
            })
        };

        // destructuring  first element from array res. we can name it anything
        const [fileResponse] = res;

        // key is imp for matching and saving it on database
        const key = fileResponse?.key;

        if (!key) {
          return toast({
            title: 'Something went Wrong. Key',
            description: "Please try again later",
            variant: 'destructive'
          })
        };

        // finished handling upload
        clearInterval(progressInterval);
        setUploadProgress(100);

        // VV imp: Polling should be done at last so there is no errors. 
        startPolling({ key });

      }}
    >
      {/* after droping file in dropzone file will be in acceptedFile */}
      {({getRootProps, getInputProps, acceptedFiles}) => (
        <div 
          {...getRootProps() } 
          className='border h-64 m-4 border-dashed border-gray-300 rounded-lg'
        >
          <div
            className='flex items-center justify-center h-full w-full'
          >
            <label 
              htmlFor="dropzpne-file"
              className='flex flex-col items-center justify-center w-full h-full rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100'
            >
              <div
                className='flex flex-col items-center justify-center pt-5 pb-6'
              >
                <Cloud className='h-6 w-6 text-zinc-500 mb-2' />
                <p className='mb-2 text-sm text-zinc-700'>
                  <span className='font-semibold'>
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </p>
                <p className='text-xs text-zinc-500'>
                  PDF (up to 4MB)
                </p>
              </div>

              {acceptedFiles && acceptedFiles[0] ? (
                <div
                  className='max-w-xs bg-white flex items-center rounded-md overflow-hidden outline outline-[1px] outline-zinc-200 divide-x divide-zinc-200'
                >
                  <div className="px-3 py-2 h-full grid place-items-center">
                    <File className='h-4 w-4 text-blue-500'/>
                  </div>
                  <div
                    className='px-3 py-2 h-full text-sm truncate'
                  >
                    {acceptedFiles[0].name}
                  </div>
                </div>
              ): null }

              {isUploading ? (
                <div
                  className='w-full mt-4 max-w-xs mx-auto'
                >
                  <Progress
                    indicatorColor={
                      uploadProgress === 100 ? 'bg-green-500':''
                    } 
                    value={uploadProgress}
                    className='h-1 w-full bg-zinc-200'
                  />
                {uploadProgress === 100 ? (
                  <div
                    className='flex gap-1 items-center justify-center text-sm text-zinc-700 text-center pt-2'
                  >
                    <Loader className='h-3 w-3 animate-spin' />
                    Redirecting...
                  </div>
                ): null}
                </div>
              ):null}

              {/* to upload to uploadthing */}
              <input 
                // hidden
                {...getInputProps()}
                type='file' id='dropzone-file' className='hidden' 
              />
            </label>
          </div>
        </div>
      )}
    </Dropzone>
  )
}

const UploadButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false)

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
        // DialogTrigger is button in itself so, we use asChild so we are able to pass another button
        asChild
        onClick={() => setIsOpen(true)}
      >
        <Button>
          Upload PDF
        </Button>
      </DialogTrigger>

      <DialogContent>
        <UploadDropzone />
      </DialogContent>
    </Dialog>
  )
}

export default UploadButton;