"use client"

import { ArrowRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";


export default function MoblieNav({ isAuth }: { isAuth: boolean }) {

    const [isOpen, setIsOpen] = useState<boolean>(false);
    const toggleOpen = () => setIsOpen((prev) => !prev);

    const pathname = usePathname();

    // making sure mobile navbar closes every time path or page changes
    useEffect(() => {
        if (isOpen) toggleOpen()
    }, [pathname]);

    // IMP: imp trick
    // of  href  provided is currnt page  then we dont want navigation but close of mobile navbar. It wont reload the page when we are already in the page we want to navigate
    const closeOnCurrent = (href: string) => {
        if (pathname === href) {
            toggleOpen();
        }
    }

    return (
        <div
            className="sm:hidden"
        >
            <Menu
                onClick={toggleOpen}
                className="relative z-50 h-5 w-5 text-zinc-700"
            />

            {isOpen ? (
                <div
                    className="fixed animate-in slide-in-from-top-5 fade-in-20 inset-0 z-0 w-full"
                >
                    <ul
                        className="absolute bg-white border-b border-zinc-200 shadow-xl grid w-full gap-3 px-10 pt-20 pb-8"
                    >
                        {!isAuth ? (
                            <>
                                <li>
                                    <Link
                                        onClick={() => closeOnCurrent('/sign-up')}
                                        className="flex items-center w-full font-semibold text-green-600"
                                        href='/sign-up'
                                    >
                                        Get started
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Link>
                                </li>
                                <li className=" my-2 h-px  w-full bg-gray-300" />
                                <li>
                                    <Link
                                        onClick={() => closeOnCurrent('/sign-in')}
                                        className="flex items-center w-full font-semibold "
                                        href='/sign-in'
                                    >
                                        Sign In
                                    </Link>
                                </li>
                                <li className=" my-2 h-px  w-full bg-gray-300" />
                                <li>
                                    <Link
                                        onClick={() => closeOnCurrent('/pricing')}
                                        className="flex items-center w-full font-semibold "
                                        href='/pricing'
                                    >
                                        Pricing
                                    </Link>
                                </li>
                            </>
                        ) : (
                            <>
                                <li>
                                    <Link
                                        onClick={() => closeOnCurrent('/dashboard')}
                                        className="flex items-center w-full font-semibold "
                                        href='/dashboard'
                                    >
                                        Dashboard
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Link>
                                </li>
                                <li className=" my-2 h-px  w-full bg-gray-300" />
                                <li>
                                    <Link
                                        className="flex items-center w-full font-semibold text-red-600"
                                        href='/sign-out'
                                    >
                                        Sign-Out
                                    </Link>
                                </li>
                            </>
                            
                        )}
                    </ul>
                </div>
            ) : null}
        </div>
    )
}
