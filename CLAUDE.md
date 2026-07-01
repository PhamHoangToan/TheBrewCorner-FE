# TheBrewCorner FE — Claude Instructions

## Stack
- Vite + React + TypeScript
- Ant Design (UI components)
- TanStack Query (data fetching)
- Zustand (state management)
- Axios (HTTP client)
- React Router v6

## Figma
- File key: MqWZpJ3CyFIN9vhataaDZB
- 4 roles: Admin, Thu ngân, Pha chế, Phục vụ

## Folder convention
- Page:      src/pages/PageName/index.tsx
- Component: src/components/common/ComponentName/index.tsx
- Form:      src/components/forms/FormName/index.tsx
- 1 Figma frame = 1 folder trong pages/

## Code style
- Props dùng TypeScript interface đặt trên đầu file
- Ưu tiên Ant Design components, custom nếu Antd không có
- Không dùng inline style → dùng CSS module (.module.css) hoặc Ant Design token
- Export default ở cuối file
- Label/text giữ nguyên tiếng Việt theo Figma

## Component template
```tsx
import React from 'react'

interface Props {
  // define props here
}

const ComponentName: React.FC<Props> = (props) => {
  return <></>
}

export default ComponentName
```

## Reusable components (tạo 1 lần, dùng nhiều nơi)
- AppLayout: layout chung có Sidebar + Header
- Sidebar: menu điều hướng theo role
- Header: topbar có avatar + tên user
- PageHeader: tiêu đề trang + breadcrumb
- ConfirmModal: modal xác nhận dùng chung

## Khi generate từ Figma
1. Dùng get_figma_data đọc frame chỉ định
2. Phân tích layout, màu sắc, spacing, typography
3. Map sang Ant Design component tương ứng
4. Tách sub-component nếu xuất hiện ≥ 2 lần hoặc quá phức tạp
5. Output đúng folder, đúng tên file