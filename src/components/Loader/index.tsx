import React from 'react';
import anime from 'animejs';
// import v3 from '../../assets/images/whitev3.svg'
import styled, { keyframes, css } from 'styled-components'

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`

const StyledSVG = styled.svg<{ size: string; stroke?: string }>`
  animation: 2s ${rotate} linear infinite;
  height: ${({ size }) => size};
  width: ${({ size }) => size};
  path {
    stroke: ${({ stroke, theme }) => stroke ?? theme.primary1};
  }
`

/**
 * Takes in custom size and stroke for circle color, default to primary color as fill,
 * need ...rest for layered styles on top
 */
export default function Loader({
  size = '16px',
  stroke,
  ...rest
}: {
  size?: string
  stroke?: string
  [k: string]: any
}) {
  return (
    <StyledSVG viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" size={size} stroke={stroke} {...rest}>
      <path
        d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 9.27455 20.9097 6.80375 19.1414 5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </StyledSVG>
  )
}

const pulse = keyframes`
  0% { transform: scale(1); }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); }
`

const Wrapper = styled.div<{ fill: number; height?: string }>`
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme, fill }) => (fill ? 'black' : theme.bg0)};
  height: 100%;
  width: 100%;
  ${(props) =>
    props.fill && !props.height
      ? css`
          height: 100vh;
        `
      : css`
          height: 180px;
        `}
`

const AnimatedImg = styled.div`
  animation: ${pulse} 800ms linear infinite;
  & > * {
    width: 72px;
  }
`

const StyledPreloadText = styled.div`
  font-size: 4vw;
  position: relative;
  display: inline-block;
  overflow: hidden;
`

const StyledTextBlock = styled.span`
  position: relative;
  display: inline-block;
  overflow: hidden; 
`

const StyledTextLetter = styled.span`
  transform-origin: 0 100%;
  display: inline-block;
  line-height: 1em;
`

const Text = "CerbySwap";



const easing = "easeInOutQuint"
const duration = 1000
const delay = 40



export const LocalLoader = ({ fill }: { fill: boolean }) => {
  const animation = anime.timeline({
    loop: true,
    autoplay: true
  })
  animation
  .add({
      targets: '.' + StyledTextLetter.styledComponentId,
      translateX: ["-1em", 0],
      duration,
      // easing: "easeOutBounce",
      easing,
      delay: (el, i) => delay * i
  })
  .add({
      targets: '.' + StyledTextLetter.styledComponentId,
      translateX: [0, "1em"],
      duration,
      easing,
      delay: (el, i) => delay * i + 1000,
  })
  return (
    <Wrapper fill={fill ? 1 : 0}>
      <StyledPreloadText>
      {Text.split('').map((char, i) => { return <StyledTextBlock key={i}><StyledTextLetter>{ char }</StyledTextLetter></StyledTextBlock>})}
      </StyledPreloadText>
    </Wrapper>
  )
}

const loadingAnimation = keyframes`
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`

export const LoadingRows = styled.div`
  display: grid;
  min-width: 75%;
  max-width: 100%;
  grid-column-gap: 0.5em;
  grid-row-gap: 0.8em;
  grid-template-columns: repeat(3, 1fr);
  & > div {
    animation: ${loadingAnimation} 1.5s infinite;
    animation-fill-mode: both;
    background: linear-gradient(
      to left,
      ${({ theme }) => theme.bg1} 25%,
      ${({ theme }) => theme.bg2} 50%,
      ${({ theme }) => theme.bg1} 75%
    );
    background-size: 400%;
    border-radius: 12px;
    height: 2.4em;
    will-change: background-position;
  }
  & > div:nth-child(4n + 1) {
    grid-column: 1 / 3;
  }
  & > div:nth-child(4n) {
    grid-column: 3 / 4;
    margin-bottom: 2em;
  }
`
