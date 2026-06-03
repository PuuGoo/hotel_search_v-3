"use client";

import { Fragment, useState } from "react";
import { FiPlus, FiSearch, FiStar } from "react-icons/fi";
import { Dialog, Transition } from "@headlessui/react";
import { IoClose } from "react-icons/io5";

interface HotelData {
  id: string;
  name: string;
  address: string;
  rating: number;
  priceRange: string;
  description: string;
  url: string;
  images: string[];
}

interface AddHotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (hotel: HotelData) => void;
  existingIds: string[];
}

const POPULAR_HOTELS: HotelData[] = [
  {
    id: "1",
    name: "Hotel Nikko Saigon",
    address: "235 Nguyen Van Cu, Quan 1, TP. Ho Chi Minh",
    rating: 5,
    priceRange: "2.500.000 - 5.000.000 VND",
    description: "Khách sạn 5 sao sang trọng với dịch vụ đẳng cấp quốc tế, nằm ngay trung tâm TP. Hồ Chí Minh.",
    url: "https://www.nikko-saigon.com",
    images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945"],
  },
  {
    id: "2",
    name: "JW Marriott Hotel Hanoi",
    address: "8 Do Duc Duc, Nam Tu Liem, Ha Noi",
    rating: 5,
    priceRange: "3.000.000 - 7.000.000 VND",
    description: "Khách sạn JW Marriott cao cấp tại Hà Nội, phù hợp cho du lịch và công tác.",
    url: "https://www.marriott.com/hotels/travel/hanoi-jw-marriott-hotel",
    images: ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa"],
  },
  {
    id: "3",
    name: "InterContinental Danang Sun Peninsula Resort",
    address: "Bai Bac, Son Tra, Da Nang",
    rating: 5,
    priceRange: "4.000.000 - 10.000.000 VND",
    description: "Resort cao cấp với tầm nhìn toàn cảnh vịnh biển, kiến trúc độc đáo.",
    url: "https://www.ihg.com/intercontinental/hotels/us/en/danang/dadsr/hoteldetail",
    images: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d"],
  },
  {
    id: "4",
    name: "Fusion Resort Phu Quoc",
    address: "Duong To, Phu Quoc, Kien Giang",
    rating: 4,
    priceRange: "2.000.000 - 6.000.000 VND",
    description: "Resort nghỉ dưỡng cao cấp tại Phú Quốc với dịch vụ spa bao gồm.",
    url: "https://www.fusionresortphuquoc.com",
    images: ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4"],
  },
  {
    id: "5",
    name: "The Reverie Saigon",
    address: "22 - 36 Nguyen Hue, Quan 1, TP. Ho Chi Minh",
    rating: 5,
    priceRange: "3.500.000 - 8.000.000 VND",
    description: "Khách sạn boutique sang trọng với thiết kế nội thất Italy, view phố đi bộ.",
    url: "https://thereveriesaigon.com",
    images: ["https://images.unsplash.com/photo-1564501049412-61c2a3083791"],
  },
  {
    id: "6",
    name: "Amanoi Ninh Thuan",
    address: "Vinh Hy, Nui Chua, Ninh Thuan",
    rating: 5,
    priceRange: "8.000.000 - 20.000.000 VND",
    description: "Khu nghỉ dưỡng Aman cao cấp, ẩn mình giữa thiên nhiên hoang sơ.",
    url: "https://www.aman.com/resorts/amanoi",
    images: ["https://images.unsplash.com/photo-1578683010236-d716f9a3f461"],
  },
  {
    id: "7",
    name: "Vinpearl Resort Nha Trang",
    address: "Hon Tre, Nha Trang, Khanh Hoa",
    rating: 4,
    priceRange: "1.500.000 - 4.000.000 VND",
    description: "Khu nghỉ dưỡng trên đảo Hòn Tre với bãi biển riêng và nhiều tiện ích.",
    url: "https://www.vinpearl.com/vinpearl-resort-nha-trang",
    images: ["https://images.unsplash.com/photo-1582719508461-905c673771fd"],
  },
  {
    id: "8",
    name: "Sheraton Grand Danang Resort",
    address: "35 Truong Sa, Ngu Hanh Son, Da Nang",
    rating: 5,
    priceRange: "2.500.000 - 6.000.000 VND",
    description: "Khách sạn Sheraton bên bờ biển với hồ bơi vô cực và dịch vụ đẳng cấp.",
    url: "https://www.marriott.com/hotels/travel/dadsn-sheraton-grand-danang-resort-and-convention-center",
    images: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb"],
  },
];

const AddHotelModal: React.FC<AddHotelModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  existingIds,
}) => {
  const [search, setSearch] = useState("");

  const filtered = POPULAR_HOTELS.filter(
    (h) =>
      !existingIds.includes(h.id) &&
      (h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.address.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = (hotel: HotelData) => {
    onAdd(hotel);
    onClose();
    setSearch("");
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all w-full sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block z-10">
                  <button
                    type="button"
                    className="rounded-md bg-gray-800 text-gray-400 hover:text-gray-300 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Đóng</span>
                    <IoClose className="h-6 w-6" />
                  </button>
                </div>

                <Dialog.Title className="text-lg font-semibold text-white mb-4">
                  Thêm khách sạn
                </Dialog.Title>

                <div className="relative mb-4">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm tên khách sạn..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-sky-500 text-sm"
                  />
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2">
                  {filtered.length === 0 ? (
                    <p className="text-center text-gray-400 py-6 text-sm">
                      {search
                        ? "Không tìm thấy khách sạn phù hợp"
                        : "Đã thêm tất cả khách sạn phổ biến"}
                    </p>
                  ) : (
                    filtered.map((hotel) => (
                      <div
                        key={hotel.id}
                        className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {hotel.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {hotel.address}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: hotel.rating }).map((_, i) => (
                              <FiStar
                                key={i}
                                className="w-3 h-3 text-yellow-400 fill-yellow-400"
                              />
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAdd(hotel)}
                          className="ml-3 p-2 text-sky-400 hover:bg-sky-500/20 rounded-lg transition-colors flex-shrink-0"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default AddHotelModal;
