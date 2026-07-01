import React from 'react'
import { motion } from 'framer-motion'

interface Props {
  children: React.ReactNode
  style?: React.CSSProperties
}

const PageTransition: React.FC<Props> = ({ children, style }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
    exit={{ opacity: 0, y: -8, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
    style={{ height: '100%', ...style }}
  >
    {children}
  </motion.div>
)

export default PageTransition
