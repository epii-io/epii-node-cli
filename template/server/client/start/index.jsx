import React, {Component} from 'react'

export default class extends Component {
  constructor() {
    super()
    this.state = window.epii.state
  }

  render() {
    var { title } = this.state
    return (
      <div className='container'>
        <div>{title}</div>
      </div>
    )
  }
}
