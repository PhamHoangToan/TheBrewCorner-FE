import React from 'react'
import { Breadcrumb, Typography } from 'antd'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface Props {
  title: string
  breadcrumbs?: BreadcrumbItem[]
}

const PageHeader: React.FC<Props> = ({ title, breadcrumbs = [] }) => {
  return (
    <div style={{ marginBottom: 24 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumb
          items={breadcrumbs.map((b) => ({ title: b.label, href: b.href }))}
          style={{ marginBottom: 8 }}
        />
      )}
      <Typography.Title
        level={3}
        style={{ margin: 0, color: '#301E1E', fontFamily: 'Montserrat, sans-serif' }}
      >
        {title}
      </Typography.Title>
    </div>
  )
}

export default PageHeader
