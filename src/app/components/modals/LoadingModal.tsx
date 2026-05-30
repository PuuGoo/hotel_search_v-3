"use client";

import React, { Fragment, useRef } from "react";
import { ClipLoader } from "react-spinners";

import { Dialog, Transition } from "@headlessui/react";

const LoadingModal = () => {
  // The dialog's only content is a spinner (nothing tabbable), so HeadlessUI's
  // FocusTrap warns it has no element to focus. Point initialFocus at this
  // non-tabbable wrapper (tabIndex={-1}) to satisfy the trap quietly.
  const focusRef = useRef<HTMLDivElement>(null);

  return (
    <Transition.Root show as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        initialFocus={focusRef}
        onClose={() => {}}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="
              fixed 
              inset-0 
              bg-gray-100 
              bg-opacity-50 
              transition-opacity
              dark:bg-lightgray
              dark:bg-opacity-50
            "
          />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div
            className="
              flex 
              min-h-full 
              items-center 
              justify-center 
              p-4 
              text-center 
            "
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel>
                <div ref={focusRef} tabIndex={-1} className="outline-none">
                  <ClipLoader size={40} color="#0284c7" />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default LoadingModal;
