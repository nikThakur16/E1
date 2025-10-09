import React from 'react';

export interface DropdownItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;

  textColor?: string;
  hoverColor?: string;

}

export interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items?: DropdownItem[];
  onExportPDF?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  trianglePosition?: 'left' | 'center' | 'right';
  width?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  isOpen,
  onClose,
  items,
  onExportPDF,
  onDelete,
  onCopy,
  trianglePosition = 'right',
  width = 'w-44'
}) => {
  if (!isOpen) return null;

  const getTrianglePositionClass = () => {
    switch (trianglePosition) {
      case 'left': return 'left-4';
      case 'center': return 'left-1/2 transform -translate-x-1/2';
      case 'right': return 'right-4';
      default: return 'right-4';
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-dropdown]')) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Generate default items if not provided
  const defaultItems: DropdownItem[] = [];

  // Always show Export PDF first if handler provided
  if (onExportPDF) {
    defaultItems.push({
      id: 'export-pdf',
      label: 'Export as PDF',
      icon: (
        <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="13.0674" cy="13.9605" rx="13" ry="13.0015" fill="#E5EFFF"/>
        <path d="M10.5781 15.748C10.4554 15.748 10.3727 15.76 10.3301 15.772V16.5574C10.3807 16.5694 10.4441 16.5727 10.5314 16.5727C10.8507 16.5727 11.0474 16.4114 11.0474 16.1387C11.0474 15.8947 10.8781 15.748 10.5781 15.748ZM12.9027 15.756C12.7694 15.756 12.6827 15.768 12.6314 15.78V17.52C12.6827 17.532 12.7654 17.532 12.8401 17.532C13.3847 17.536 13.7394 17.236 13.7394 16.6014C13.7434 16.048 13.4201 15.756 12.9027 15.756Z" fill="#3F7EF8"/>
        <path d="M14.401 7.29492H9.06771C8.71409 7.29492 8.37495 7.4354 8.1249 7.68545C7.87485 7.93549 7.73438 8.27463 7.73438 8.62826V19.2949C7.73438 19.6485 7.87485 19.9877 8.1249 20.2377C8.37495 20.4878 8.71409 20.6283 9.06771 20.6283H17.0677C17.4213 20.6283 17.7605 20.4878 18.0105 20.2377C18.2606 19.9877 18.401 19.6485 18.401 19.2949V11.2949L14.401 7.29492ZM11.3997 16.7549C11.1937 16.9483 10.8897 17.0349 10.5357 17.0349C10.4671 17.0357 10.3985 17.0317 10.3304 17.0229V17.9736H9.73438V15.3496C10.0033 15.3095 10.2751 15.2912 10.547 15.2949C10.9184 15.2949 11.1824 15.3656 11.3604 15.5076C11.5297 15.6423 11.6444 15.8629 11.6444 16.1229C11.6437 16.3843 11.557 16.6049 11.3997 16.7549ZM13.9377 17.6583C13.6577 17.8909 13.2317 18.0016 12.711 18.0016C12.399 18.0016 12.1784 17.9816 12.0284 17.9616V15.3503C12.2974 15.311 12.5691 15.2925 12.841 15.2949C13.3457 15.2949 13.6737 15.3856 13.9297 15.5789C14.2064 15.7843 14.3797 16.1116 14.3797 16.5816C14.3797 17.0903 14.1937 17.4416 13.9377 17.6583ZM16.401 15.8083H15.3797V16.4156H16.3344V16.9049H15.3797V17.9743H14.7757V15.3149H16.401V15.8083ZM14.401 11.9616H13.7344V8.62826L17.0677 11.9616H14.401Z" fill="#3F7EF8"/>
        </svg>
        
      ),
      onClick: onExportPDF,

    });
  }

  // Only show Copy if handler provided
  if (onCopy) {
    defaultItems.push({
      id: 'copy',
      label: 'Copy',
      icon: (
        <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="13.2178" cy="13.5601" rx="13" ry="13.0015" fill="#F59E0B" fill-opacity="0.18"/>
        <g clip-path="url(#clip0_1166_7896)">
        <path d="M18.499 7.06006C19.1721 7.06006 19.7178 7.6057 19.7178 8.27881V15.5913C19.7178 16.2644 19.1721 16.8101 18.499 16.8101H11.1865C10.5134 16.8101 9.96777 16.2644 9.96777 15.5913V8.27881C9.96777 7.6057 10.5134 7.06006 11.1865 7.06006H18.499ZM11.1865 17.6226C10.0665 17.6226 9.15527 16.7113 9.15527 15.5913V10.3101H7.93652C7.26342 10.3101 6.71777 10.8557 6.71777 11.5288V18.8413C6.71777 19.5144 7.26342 20.0601 7.93652 20.0601H15.249C15.9221 20.0601 16.4678 19.5144 16.4678 18.8413V17.6226H11.1865Z" fill="#F59E0B"/>
        </g>
        <defs>
        <clipPath id="clip0_1166_7896">
        <rect width="13" height="13" fill="white" transform="translate(6.71777 7.06006)"/>
        </clipPath>
        </defs>
        </svg>
        
      ),
      onClick: onCopy,

    });
  }

  // Always show Delete last if handler provided
  if (onDelete) {
    defaultItems.push({
      id: 'delete',
      label: 'Delete',
      icon: (
        <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="13.0674" cy="13.9624" rx="13" ry="13.0015" fill="#FF0101" fill-opacity="0.08"/>
        <path d="M10.401 8.63021C10.401 8.4534 10.4713 8.28383 10.5963 8.1588C10.7213 8.03378 10.8909 7.96354 11.0677 7.96354H15.0677C15.2445 7.96354 15.4141 8.03378 15.5391 8.1588C15.6641 8.28383 15.7344 8.4534 15.7344 8.63021V8.96354H16.401V8.29687C16.401 8.03166 16.2957 7.7773 16.1081 7.58977C15.9206 7.40223 15.6663 7.29688 15.401 7.29688H10.7344C10.4692 7.29688 10.2148 7.40223 10.0273 7.58977C9.83973 7.7773 9.73438 8.03166 9.73438 8.29687V8.96354H10.401V8.63021Z" fill="#E11D48"/>
        <path d="M19.4004 9.63086H6.73372C6.64532 9.63086 6.56053 9.66598 6.49802 9.72849C6.43551 9.791 6.40039 9.87579 6.40039 9.96419C6.40039 10.0526 6.43551 10.1374 6.49802 10.1999C6.56053 10.2624 6.64532 10.2975 6.73372 10.2975H8.06706V19.6309C8.06706 19.8961 8.17241 20.1504 8.35995 20.338C8.54749 20.5255 8.80184 20.6309 9.06706 20.6309H17.0671C17.3323 20.6309 17.5866 20.5255 17.7742 20.338C17.9617 20.1504 18.0671 19.8961 18.0671 19.6309V10.2975H19.4004C19.4888 10.2975 19.5736 10.2624 19.6361 10.1999C19.6986 10.1374 19.7337 10.0526 19.7337 9.96419C19.7337 9.87579 19.6986 9.791 19.6361 9.72849C19.5736 9.66598 19.4888 9.63086 19.4004 9.63086ZM11.0671 17.2975C11.0671 17.3859 11.0319 17.4707 10.9694 17.5332C10.9069 17.5957 10.8221 17.6309 10.7337 17.6309C10.6453 17.6309 10.5605 17.5957 10.498 17.5332C10.4355 17.4707 10.4004 17.3859 10.4004 17.2975V12.6309C10.4004 12.5425 10.4355 12.4577 10.498 12.3952C10.5605 12.3326 10.6453 12.2975 10.7337 12.2975C10.8221 12.2975 10.9069 12.3326 10.9694 12.3952C11.0319 12.4577 11.0671 12.5425 11.0671 12.6309V17.2975ZM13.4004 17.9642C13.4004 18.0526 13.3653 18.1374 13.3028 18.1999C13.2402 18.2624 13.1555 18.2975 13.0671 18.2975C12.9787 18.2975 12.8939 18.2624 12.8314 18.1999C12.7688 18.1374 12.7337 18.0526 12.7337 17.9642V11.9642C12.7337 11.8758 12.7688 11.791 12.8314 11.7285C12.8939 11.666 12.9787 11.6309 13.0671 11.6309C13.1555 11.6309 13.2402 11.666 13.3028 11.7285C13.3653 11.791 13.4004 11.8758 13.4004 11.9642V17.9642ZM15.7337 17.2975C15.7337 17.3859 15.6986 17.4707 15.6361 17.5332C15.5736 17.5957 15.4888 17.6309 15.4004 17.6309C15.312 17.6309 15.2272 17.5957 15.1647 17.5332C15.1022 17.4707 15.0671 17.3859 15.0671 17.2975V12.6309C15.0671 12.5425 15.1022 12.4577 15.1647 12.3952C15.2272 12.3326 15.312 12.2975 15.4004 12.2975C15.4888 12.2975 15.5736 12.3326 15.6361 12.3952C15.6986 12.4577 15.7337 12.5425 15.7337 12.6309V17.2975Z" fill="#E11D48"/>
        </svg>
        
      ),
      onClick: onDelete,

    });
  }

  // Use provided items or default items
  const menuItems = items || defaultItems;

  return (
    <div 
      className={`absolute right-0 mt-2 ${width} bg-white border border-gray-200 rounded-lg shadow-lg z-50`}
      data-dropdown
    >
      {/* Triangle pointer */}
      <div className={`absolute -top-2 ${getTrianglePositionClass()} w-4 h-4 bg-white border-l border-t border-gray-200 transform rotate-45`}></div>
      
      <div className="py-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            className={`flex items-center w-full px-4 py-2.5 text-[14px]  leading-[24px] transition-colors text-[#4B5563] font-[500] cursor-pointer`}
          >
            <div className="w-6 h-6 mr-3 flex items-center justify-center">
              {React.isValidElement(item.icon) ? 
                item.icon : 
                <img src={item.icon as string} alt={item.label} className="w-5 h-5" />
              }
            </div>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DropdownMenu; 